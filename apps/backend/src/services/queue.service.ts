/**
 * Queue Service
 *
 * Clean API consumed by route handlers to schedule / cancel research
 * and delivery jobs backed by BullMQ.
 */

import { Queue } from "bullmq";

function getPreRunMinutes(): number {
  return parseInt(process.env.QUEUE_PRE_RUN_MINUTES || "15", 10);
}

export interface ScheduleResearchOpts {
  userId: string;
  projectId: string;
  projectTitle: string;
  nextRunAt: number;
  isRunNow?: boolean;
  isOneShot?: boolean;
}

export class QueueService {
  constructor(
    private researchQueue: Queue,
    private deliveryQueue: Queue
  ) {}

  /**
   * Schedule a research job for a project.
   *
   * The job is delayed so that research starts PRE_RUN_MINUTES before the
   * scheduled delivery (nextRunAt).  For "run-now" or "once" projects the
   * delay is 0 (immediate).
   *
   * Uses a deterministic job ID (`research:{userId}:{projectId}`) so that
   * re-scheduling automatically replaces the previous job.
   */
  async scheduleResearch(opts: ScheduleResearchOpts): Promise<void> {
    const {
      userId,
      projectId,
      projectTitle,
      nextRunAt,
      isRunNow = false,
      isOneShot = false,
    } = opts;

    const baseJobId = `research:${userId}:${projectId}`;

    // Remove any existing research & delivery jobs for this project first
    const removed = await this.removeJob(this.researchQueue, baseJobId);
    await this.removeJob(this.deliveryQueue, `delivery:${userId}:${projectId}`);

    // If the old job is currently active (being processed), use a unique
    // suffix so the add() doesn't collide.  The active job will finish and
    // the worker's stale-job guard (nextRunAt mismatch) makes it a no-op.
    const jobId = removed ? baseJobId : `${baseJobId}:${Date.now()}`;

    let delay: number;
    if (isRunNow) {
      delay = 0;
    } else {
      // Start research PRE_RUN_MINUTES before delivery time
      delay = Math.max(0, nextRunAt - getPreRunMinutes() * 60_000 - Date.now());
    }

    await this.researchQueue.add(
      "research",
      {
        userId,
        projectId,
        projectTitle,
        nextRunAt,
        isRunNow,
        isOneShot,
      },
      {
        jobId,
        delay,
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: { age: 7 * 24 * 3600 }, // keep 7 days
        removeOnFail: { age: 14 * 24 * 3600 }, // keep 14 days
      }
    );
  }

  /**
   * Schedule a delivery job for a project.
   *
   * Called by the research worker after research succeeds.
   */
  async scheduleDelivery(opts: {
    userId: string;
    projectId: string;
    projectTitle: string;
    nextRunAt: number;
    isRunNow?: boolean;
    isOneShot?: boolean;
  }): Promise<void> {
    const {
      userId,
      projectId,
      projectTitle,
      nextRunAt,
      isRunNow = false,
      isOneShot = false,
    } = opts;

    const baseJobId = `delivery:${userId}:${projectId}`;
    const removed = await this.removeJob(this.deliveryQueue, baseJobId);
    const jobId = removed ? baseJobId : `${baseJobId}:${Date.now()}`;

    // Deliver at the scheduled time (or immediately for run-now)
    const delay = isRunNow ? 0 : Math.max(0, nextRunAt - Date.now());

    await this.deliveryQueue.add(
      "delivery",
      {
        userId,
        projectId,
        projectTitle,
        nextRunAt,
        isRunNow,
        isOneShot,
      },
      {
        jobId,
        delay,
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 7 * 24 * 3600 },
        removeOnFail: { age: 14 * 24 * 3600 },
      }
    );
  }

  /**
   * Check if a research job already exists for a project (any state).
   * Used by recovery scan to skip re-scheduling when the job is fine.
   */
  async hasResearchJob(userId: string, projectId: string): Promise<boolean> {
    return this.jobExistsByPrefix(
      this.researchQueue,
      `research:${userId}:${projectId}`
    );
  }

  /**
   * Check if a delivery job already exists for a project (any state).
   */
  async hasDeliveryJob(userId: string, projectId: string): Promise<boolean> {
    return this.jobExistsByPrefix(
      this.deliveryQueue,
      `delivery:${userId}:${projectId}`
    );
  }

  /**
   * Cancel all pending jobs for a project (used on delete/pause).
   * Removes both the base job ID and any timestamp-suffixed variants.
   */
  async cancelProjectJobs(userId: string, projectId: string): Promise<void> {
    await this.removeJobsByPrefix(
      this.researchQueue,
      `research:${userId}:${projectId}`
    );
    await this.removeJobsByPrefix(
      this.deliveryQueue,
      `delivery:${userId}:${projectId}`
    );
  }

  // ── helpers ──────────────────────────────────────────────────────────

  /**
   * Remove a job if it is in a removable state (delayed/waiting/failed/completed).
   * Returns true if the job was removed or didn't exist, false if it is
   * currently active and cannot be removed.
   */
  private async removeJob(queue: Queue, jobId: string): Promise<boolean> {
    try {
      const job = await queue.getJob(jobId);
      if (!job) return true;

      const state = await job.getState();
      if (
        state === "delayed" ||
        state === "waiting" ||
        state === "failed" ||
        state === "completed"
      ) {
        await job.remove();
        return true;
      }
      // Job is active — can't remove right now
      return false;
    } catch {
      // Job may not exist — safe to treat as removed
      return true;
    }
  }

  /**
   * Check if any job with the given prefix exists in active, delayed, or waiting state.
   */
  private async jobExistsByPrefix(
    queue: Queue,
    prefix: string
  ): Promise<boolean> {
    // Check exact base ID first (fast path)
    const baseJob = await queue.getJob(prefix);
    if (baseJob) {
      const state = await baseJob.getState();
      if (state === "active" || state === "delayed" || state === "waiting") {
        return true;
      }
    }

    // Check for timestamp-suffixed variants in delayed/waiting
    for (const state of ["delayed", "waiting"] as const) {
      const jobs = await queue.getJobs([state]);
      for (const job of jobs) {
        if (job.id && job.id.startsWith(prefix)) return true;
      }
    }
    return false;
  }

  /**
   * Remove all jobs whose ID starts with `prefix` (handles timestamp-suffixed
   * variants like `research:uid:pid:1709876543210`).
   */
  private async removeJobsByPrefix(
    queue: Queue,
    prefix: string
  ): Promise<void> {
    // 1. Remove the exact base ID
    await this.removeJob(queue, prefix);

    // 2. Scan delayed and waiting jobs for timestamp-suffixed variants
    for (const state of ["delayed", "waiting"] as const) {
      const jobs = await queue.getJobs([state]);
      for (const job of jobs) {
        if (job.id && job.id !== prefix && job.id.startsWith(prefix)) {
          try {
            await job.remove();
          } catch {
            // Job may have already been picked up — ignore
          }
        }
      }
    }
  }
}
