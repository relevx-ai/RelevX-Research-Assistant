/**
 * Research Worker
 *
 * BullMQ processor for the "research" queue.
 * Executes research for a single project, then enqueues a delivery job.
 */

import type { Job, Processor } from "bullmq";
import { db, executeResearchForProject } from "core";
import type { Project } from "core";
import { initializeProviders } from "../utils/providers.js";
import type { QueueService } from "../services/queue.service.js";

export interface ResearchJobData {
  userId: string;
  projectId: string;
  projectTitle: string;
  nextRunAt: number;
  isRunNow: boolean;
  isOneShot: boolean;
}

export function createResearchProcessor(
  queueService: QueueService,
  log: { info: Function; warn: Function; error: Function }
): Processor<ResearchJobData> {
  return async (job: Job<ResearchJobData>) => {
    const { userId, projectId, projectTitle, nextRunAt, isRunNow, isOneShot } =
      job.data;

    log.info(
      { userId, projectId, projectTitle, attempt: job.attemptsMade + 1 },
      "Research job starting"
    );

    // Ensure providers are initialized
    await initializeProviders();

    // Load fresh project state from Firestore (source of truth)
    const projectRef = db
      .collection("users")
      .doc(userId)
      .collection("projects")
      .doc(projectId);
    const projectSnap = await projectRef.get();

    if (!projectSnap.exists) {
      log.warn({ userId, projectId }, "Project not found, skipping");
      return;
    }

    const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

    // Guard: skip if paused/deleted
    if (project.status === "paused" || (project.status as string) === "deleted") {
      log.info(
        { userId, projectId, status: project.status },
        "Project no longer active, skipping"
      );
      return;
    }

    // Guard: skip if research already prepared
    if (project.preparedDeliveryLogId) {
      log.info(
        { userId, projectId },
        "Research already prepared, skipping"
      );
      return;
    }

    // Guard: skip stale job (nextRunAt changed since this job was enqueued)
    if (!isRunNow && project.nextRunAt !== nextRunAt) {
      log.info(
        {
          userId,
          projectId,
          jobNextRunAt: nextRunAt,
          currentNextRunAt: project.nextRunAt,
        },
        "nextRunAt mismatch (stale job), skipping"
      );
      return;
    }

    // Mark project as running
    await projectRef.update({
      status: "running",
      researchStartedAt: Date.now(),
      updatedAt: Date.now(),
    });

    try {
      const result = await executeResearchForProject(userId, projectId);

      if (!result.success || !result.deliveryLogId) {
        throw new Error(result.error || "Research execution failed");
      }

      log.info(
        {
          userId,
          projectId,
          deliveryLogId: result.deliveryLogId,
          durationMs: result.durationMs,
        },
        "Research completed successfully"
      );

      // Re-check project state before writing — the user may have
      // paused/deleted the project while research was running.
      const freshSnap = await projectRef.get();
      const freshStatus = freshSnap.exists
        ? (freshSnap.data()?.status as string)
        : "deleted";
      if (freshStatus === "paused" || freshStatus === "deleted") {
        log.info(
          { userId, projectId, freshStatus },
          "Project paused/deleted during research, discarding results"
        );
        return;
      }

      // Mark project as ready for delivery
      await projectRef.update({
        status: project.frequency === "once" ? "paused" : "active",
        researchStartedAt: null,
        lastError: null,
        preparedDeliveryLogId: result.deliveryLogId,
        preparedAt: Date.now(),
        deliveredAt: null,
        updatedAt: Date.now(),
      });

      // Enqueue delivery job
      const deliveryDelay = isRunNow ? 0 : Math.max(0, nextRunAt - Date.now());
      await queueService.scheduleDelivery({
        userId,
        projectId,
        projectTitle,
        nextRunAt,
        isRunNow: isRunNow || deliveryDelay === 0,
        isOneShot,
      });
    } catch (error: any) {
      // Mark project with error status
      await projectRef.update({
        status: "error",
        lastError: error.message,
        researchStartedAt: null,
        updatedAt: Date.now(),
      });

      log.error(
        { userId, projectId, error: error.message },
        "Research execution failed"
      );

      // Re-throw so BullMQ retries
      throw error;
    }
  };
}
