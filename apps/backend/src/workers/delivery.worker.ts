/**
 * Delivery Worker
 *
 * BullMQ processor for the "delivery" queue.
 * Sends email reports and handles post-delivery scheduling for recurring projects.
 */

import type { Job, Processor } from "bullmq";
import {
  db,
  sendReportEmail,
  calculateNextRunAt,
  incrementUserOneShotRun,
  kAnalyticsMonthlyDateKey,
} from "core";
import type { Project, NewDeliveryLog, RelevxUserProfile } from "core";
import type { QueueService } from "../services/queue.service.js";

export interface DeliveryJobData {
  userId: string;
  projectId: string;
  projectTitle: string;
  nextRunAt: number;
  isRunNow: boolean;
  isOneShot: boolean;
}

export function createDeliveryProcessor(
  queueService: QueueService,
  log: { info: Function; warn: Function; error: Function }
): Processor<DeliveryJobData> {
  return async (job: Job<DeliveryJobData>) => {
    const { userId, projectId, projectTitle, isOneShot } = job.data;
    const now = Date.now();

    log.info(
      { userId, projectId, projectTitle, attempt: job.attemptsMade + 1 },
      "Delivery job starting"
    );

    // Load project
    const projectRef = db
      .collection("users")
      .doc(userId)
      .collection("projects")
      .doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      log.warn({ userId, projectId }, "Project not found, skipping delivery");
      return;
    }

    const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

    // Guard: nothing to deliver
    if (!project.preparedDeliveryLogId) {
      log.warn(
        { userId, projectId },
        "No preparedDeliveryLogId, skipping delivery"
      );
      return;
    }

    // Guard: skip if deleted
    if ((project.status as string) === "deleted") {
      log.info({ userId, projectId }, "Project deleted, skipping delivery");
      return;
    }

    // Load pending delivery logs
    const deliveryLogsSnap = await projectRef
      .collection("deliveryLogs")
      .where("status", "==", "pending")
      .get();

    if (deliveryLogsSnap.empty) {
      log.warn(
        { userId, projectId },
        "No pending delivery logs found"
      );
      return;
    }

    // Load user for email
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      log.error({ userId, projectId }, "User not found, skipping delivery");
      return;
    }
    const userData = userDoc.data() as RelevxUserProfile;
    const deliveryEmail =
      project.deliveryConfig?.email?.address || userData.email;

    if (project.resultsDestination !== "email" || !deliveryEmail) {
      log.warn(
        { userId, projectId },
        "No email destination configured, skipping"
      );
      return;
    }

    // Deliver each pending log (usually just one)
    for (const deliveryLogDoc of deliveryLogsSnap.docs) {
      const deliveryLog = deliveryLogDoc.data() as NewDeliveryLog;

      const emailResult = await sendReportEmail(
        deliveryEmail,
        {
          title: deliveryLog.reportTitle,
          markdown: deliveryLog.reportMarkdown,
        },
        projectId,
        projectTitle,
        {
          summary: deliveryLog.reportSummary,
          resultCount: deliveryLog.stats?.includedResults,
          averageScore: deliveryLog.stats?.averageRelevancyScore
            ? Math.round(deliveryLog.stats.averageRelevancyScore)
            : undefined,
        }
      );

      if (!emailResult.success) {
        throw new Error(
          `Email delivery failed: ${emailResult.error || "unknown error"}`
        );
      }

      log.info(
        { userId, projectId, emailId: emailResult.id },
        "Email sent successfully"
      );

      // Mark delivery log as success
      await deliveryLogDoc.ref.update({
        status: "success",
        deliveredAt: now,
      });
    }

    // Post-delivery: update project state and schedule next cycle
    const monthKey = kAnalyticsMonthlyDateKey(new Date());

    if (project.frequency === "once") {
      // Once project: increment analytics, pause project
      try {
        await incrementUserOneShotRun(db, userId, monthKey);
      } catch (err: any) {
        log.error(
          { userId, projectId, error: err.message },
          "Failed to increment one-shot analytics"
        );
      }

      await projectRef.update({
        status: "paused",
        lastRunAt: now,
        preparedDeliveryLogId: null,
        nextRunAt: null,
        deliveredAt: now,
        updatedAt: now,
      });

      log.info({ userId, projectId }, "Once project delivered and paused");
    } else if (project.thisRunIsOneShot === true || isOneShot) {
      // One-shot run on a recurring project
      try {
        await incrementUserOneShotRun(db, userId, monthKey);
      } catch (err: any) {
        log.error(
          { userId, projectId, error: err.message },
          "Failed to increment one-shot analytics"
        );
      }

      const nextRunAt = calculateNextRunAt(
        project.frequency,
        project.deliveryTime,
        project.timezone,
        project.dayOfWeek,
        project.dayOfMonth
      );

      await projectRef.update({
        lastRunAt: now,
        preparedDeliveryLogId: null,
        thisRunIsOneShot: null,
        nextRunAt,
        deliveredAt: now,
        updatedAt: now,
      });

      log.info(
        { userId, projectId, nextRunAt: new Date(nextRunAt).toISOString() },
        "One-shot run delivered, next run scheduled"
      );

      // Enqueue next research cycle
      if (nextRunAt > 0) {
        await queueService.scheduleResearch({
          userId,
          projectId,
          projectTitle,
          nextRunAt,
        });
      }
    } else {
      // Normal recurring delivery
      const nextRunAt = calculateNextRunAt(
        project.frequency,
        project.deliveryTime,
        project.timezone,
        project.dayOfWeek,
        project.dayOfMonth
      );

      await projectRef.update({
        lastRunAt: now,
        preparedDeliveryLogId: null,
        nextRunAt,
        deliveredAt: now,
        updatedAt: now,
      });

      log.info(
        { userId, projectId, nextRunAt: new Date(nextRunAt).toISOString() },
        "Recurring delivery completed, next run scheduled"
      );

      // Enqueue next research cycle
      if (nextRunAt > 0) {
        await queueService.scheduleResearch({
          userId,
          projectId,
          projectTitle,
          nextRunAt,
        });
      }
    }
  };
}
