/**
 * Queue Plugin
 *
 * Fastify plugin that wires up BullMQ queues, workers, Bull Board
 * dashboard, and startup recovery.
 */

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { Redis as IORedis } from "ioredis";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { FastifyAdapter } from "@bull-board/fastify";
import { db } from "core";
import type { Project } from "core";

import { QueueService } from "../services/queue.service.js";
import {
  createResearchProcessor,
  type ResearchJobData,
} from "../workers/research.worker.js";
import {
  createDeliveryProcessor,
  type DeliveryJobData,
} from "../workers/delivery.worker.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
const RECOVERY_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export default fp(
  async (app: FastifyInstance) => {
    // BullMQ requires maxRetriesPerRequest: null — use a dedicated connection.
    // Cast to ConnectionOptions to avoid ioredis version mismatch between
    // the backend (5.9.1) and BullMQ's peer dep (5.9.2).
    const redisInstance = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    const connection = redisInstance as unknown as ConnectionOptions;

    redisInstance.on("error", (err: any) => {
      app.log.error({ err }, "BullMQ Redis connection error");
    });

    // ── Queues ──────────────────────────────────────────────────────────

    const researchQueue = new Queue<ResearchJobData>("research", {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 14 * 24 * 3600 },
      },
    });

    const deliveryQueue = new Queue<DeliveryJobData>("delivery", {
      connection,
      defaultJobOptions: {
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 14 * 24 * 3600 },
      },
    });

    // ── Service ─────────────────────────────────────────────────────────

    const queueService = new QueueService(researchQueue, deliveryQueue);

    // ── Workers ─────────────────────────────────────────────────────────

    const log = {
      info: (obj: any, msg?: string) => app.log.info(obj, msg),
      warn: (obj: any, msg?: string) => app.log.warn(obj, msg),
      error: (obj: any, msg?: string) => app.log.error(obj, msg),
    };

    const researchWorker = new Worker<ResearchJobData>(
      "research",
      createResearchProcessor(queueService, log),
      {
        connection: redisInstance.duplicate() as unknown as ConnectionOptions,
        concurrency: 1,
      }
    );

    const deliveryWorker = new Worker<DeliveryJobData>(
      "delivery",
      createDeliveryProcessor(queueService, log),
      {
        connection: redisInstance.duplicate() as unknown as ConnectionOptions,
        concurrency: 2,
        limiter: {
          max: 2,
          duration: 1200, // 2 jobs per 1.2 seconds
        },
      }
    );

    // Log worker events
    for (const [name, worker] of [
      ["research", researchWorker],
      ["delivery", deliveryWorker],
    ] as const) {
      worker.on("failed", (job: any, err: Error) => {
        app.log.error(
          { queue: name, jobId: job?.id, error: err.message },
          `${name} job failed`
        );
      });
      worker.on("completed", (job: any) => {
        app.log.info(
          { queue: name, jobId: job.id },
          `${name} job completed`
        );
      });
    }

    // ── Bull Board Dashboard ────────────────────────────────────────────
    // Only mount when BULL_BOARD_ENABLED is truthy (disabled by default in prod).
    if (process.env.BULL_BOARD_ENABLED === "true") {
      const serverAdapter = new FastifyAdapter();
      serverAdapter.setBasePath("/admin/queues");

      createBullBoard({
        queues: [
          new BullMQAdapter(researchQueue),
          new BullMQAdapter(deliveryQueue),
        ],
        serverAdapter,
      });

      await app.register(serverAdapter.registerPlugin(), {
        prefix: "/admin/queues",
      });

      app.log.info("Bull Board dashboard enabled at /admin/queues");
    }

    // ── Decorate ────────────────────────────────────────────────────────

    app.decorate("queueService", queueService);
    app.decorate("queueHealth", {
      researchWorker,
      deliveryWorker,
      researchQueue,
      deliveryQueue,
      redisInstance,
    });

    // ── Startup Recovery ────────────────────────────────────────────────

    // Run asynchronously so it doesn't block server start
    setImmediate(() => runStartupRecovery(queueService, app));

    // ── Periodic Recovery ─────────────────────────────────────────────
    // Safety net: re-scan Firestore every 10 minutes to catch any jobs
    // that silently disappeared from Redis.

    const recoveryInterval = setInterval(
      () => runStartupRecovery(queueService, app),
      RECOVERY_INTERVAL_MS
    );

    // ── Admin Recovery Endpoint ───────────────────────────────────────

    app.post(
      "/admin/queue/recover",
      { config: { rateLimit: false } },
      async (_req, rep) => {
        const result = await runStartupRecovery(queueService, app);
        return rep.status(200).send(result);
      }
    );

    // ── Queue Health Endpoint ─────────────────────────────────────────

    app.get(
      "/admin/queue/health",
      { config: { rateLimit: false } },
      async (_req, rep) => {
        const [researchCounts, deliveryCounts] = await Promise.all([
          researchQueue.getJobCounts(
            "waiting",
            "active",
            "delayed",
            "failed"
          ),
          deliveryQueue.getJobCounts(
            "waiting",
            "active",
            "delayed",
            "failed"
          ),
        ]);

        const redisOk = redisInstance.status === "ready";
        const researchRunning = researchWorker.isRunning();
        const deliveryRunning = deliveryWorker.isRunning();
        const healthy = redisOk && researchRunning && deliveryRunning;

        const body = {
          healthy,
          redis: redisOk ? "connected" : redisInstance.status,
          workers: {
            research: researchRunning ? "running" : "stopped",
            delivery: deliveryRunning ? "running" : "stopped",
          },
          queues: {
            research: researchCounts,
            delivery: deliveryCounts,
          },
        };

        return rep.status(healthy ? 200 : 503).send(body);
      }
    );

    // ── Graceful Shutdown ───────────────────────────────────────────────

    app.addHook("onClose", async () => {
      app.log.info("Shutting down queue workers…");
      clearInterval(recoveryInterval);
      await researchWorker.close();
      await deliveryWorker.close();
      await researchQueue.close();
      await deliveryQueue.close();
      await redisInstance.quit();
    });
  },
  { name: "queue", dependencies: ["firebase"] }
);

// ── Startup Recovery ──────────────────────────────────────────────────────

interface RecoveryResult {
  recovered: number;
  stuckReset: number;
  errors: number;
}

async function runStartupRecovery(
  queueService: QueueService,
  app: FastifyInstance
): Promise<RecoveryResult> {
  const result: RecoveryResult = { recovered: 0, stuckReset: 0, errors: 0 };

  try {
    app.log.info("Running queue recovery scan…");

    // 1. Active/error projects without prepared results → need research
    const needsResearchSnap = await db
      .collectionGroup("projects")
      .where("status", "in", ["active", "error"])
      .where("preparedDeliveryLogId", "==", null)
      .get();

    for (const doc of needsResearchSnap.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      if (!project.nextRunAt || !project.userId) continue;

      try {
        await queueService.scheduleResearch({
          userId: project.userId,
          projectId: doc.id,
          projectTitle: project.title,
          nextRunAt: project.nextRunAt,
          isRunNow: false,
          isOneShot: project.thisRunIsOneShot === true,
        });
        result.recovered++;
      } catch (err: any) {
        result.errors++;
        app.log.error(
          { projectId: doc.id, error: err.message },
          "Failed to recover research job"
        );
      }
    }

    // 2. Stuck "running" projects (>5 min) → reset to error and re-enqueue
    const stuckSnap = await db
      .collectionGroup("projects")
      .where("status", "==", "running")
      .get();

    for (const doc of stuckSnap.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      const researchStartedAt = (project as any).researchStartedAt as
        | number
        | undefined;

      if (
        researchStartedAt &&
        Date.now() - researchStartedAt > STUCK_THRESHOLD_MS
      ) {
        app.log.warn(
          { projectId: doc.id, userId: project.userId },
          "Resetting stuck running project to error"
        );

        await doc.ref.update({
          status: "error",
          lastError: "Reset by recovery scan (stuck >5 min)",
          researchStartedAt: null,
          updatedAt: Date.now(),
        });
        result.stuckReset++;

        if (project.nextRunAt && project.userId) {
          try {
            await queueService.scheduleResearch({
              userId: project.userId,
              projectId: doc.id,
              projectTitle: project.title,
              nextRunAt: project.nextRunAt,
              isRunNow: false,
            });
            result.recovered++;
          } catch (err: any) {
            result.errors++;
            app.log.error(
              { projectId: doc.id, error: err.message },
              "Failed to re-enqueue stuck project"
            );
          }
        }
      }
    }

    // 3. Projects with preparedDeliveryLogId → need delivery
    const needsDeliverySnap = await db
      .collectionGroup("projects")
      .where("preparedDeliveryLogId", "!=", null)
      .get();

    for (const doc of needsDeliverySnap.docs) {
      const project = { id: doc.id, ...doc.data() } as Project;
      if (!project.userId) continue;
      // Skip deleted projects
      if ((project.status as string) === "deleted") continue;

      try {
        await queueService.scheduleDelivery({
          userId: project.userId,
          projectId: doc.id,
          projectTitle: project.title,
          nextRunAt: project.nextRunAt || Date.now(),
          isRunNow: !project.nextRunAt || project.nextRunAt <= Date.now(),
          isOneShot: project.thisRunIsOneShot === true,
        });
        result.recovered++;
      } catch (err: any) {
        result.errors++;
        app.log.error(
          { projectId: doc.id, error: err.message },
          "Failed to recover delivery job"
        );
      }
    }

    app.log.info(result, "Queue recovery scan complete");
  } catch (err: any) {
    app.log.error(
      { error: err.message },
      "Queue recovery scan failed"
    );
  }

  return result;
}
