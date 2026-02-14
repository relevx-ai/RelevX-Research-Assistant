/**
 * Research Scheduler Service
 *
 * Runs cron jobs every minute with two main jobs:
 * 1. Research Job - Executes research for projects that need it
 *    - Pre-runs: Before delivery time based on SCHEDULER_CHECK_WINDOW_MINUTES (status: pending)
 *    - Retries: At or past delivery time if pre-run failed (status: success)
 * 2. Delivery Job - Marks prepared results as delivered when delivery time arrives
 */

import * as cron from "node-cron";
import { logger } from "./logger";
import { loadAwsSecrets } from "./plugins/aws";
import { Queue } from "elegant-queue";
import { Mutex } from "async-mutex";

// Import types from core package
import type { NewDeliveryLog, Project, RelevxUserProfile } from "core";
import {
  sendReportEmail,
  calculateNextRunAt,
  incrementUserOneShotRun,
  kAnalyticsMonthlyDateKey,
  loadConfig,
} from "core";

// Provider instances (initialized once at startup)
let providersInitialized = false;

/**
 * Get check window in milliseconds (default: 15 minutes)
 */
function getCheckWindowMs(): number {
  const minutes = parseInt(
    process.env.SCHEDULER_CHECK_WINDOW_MINUTES || "15",
    10
  );
  return minutes * 60 * 1000;
}

/**
 * Initialize providers once at startup
 * Uses research-config.yaml to determine which search provider to use
 */
async function initializeProviders(): Promise<void> {
  if (providersInitialized) {
    return;
  }

  logger.info("Initializing research providers");

  try {
    const config = loadConfig();
    const searchProviderName = config.search?.provider || "serper";

    // Validate API keys
    const openaiKey = process.env.OPENAI_API_KEY;
    const searchKey =
      searchProviderName === "brave"
        ? process.env.BRAVE_SEARCH_API_KEY
        : process.env.SERPER_API_KEY;
    const searchKeyName =
      searchProviderName === "brave" ? "BRAVE_SEARCH_API_KEY" : "SERPER_API_KEY";

    if (!openaiKey || !searchKey) {
      throw new Error(
        `Missing required API keys (OPENAI_API_KEY or ${searchKeyName})`
      );
    }

    // Import provider classes and setup function from core package
    const {
      OpenAIProvider,
      BraveSearchProvider,
      SerperSearchProvider,
      setDefaultProviders,
    } = await import("core");

    // Create provider instances
    const llmProvider = new OpenAIProvider(openaiKey);
    const searchProvider =
      searchProviderName === "brave"
        ? new BraveSearchProvider(searchKey)
        : new SerperSearchProvider({ apiKey: searchKey });

    // Set as defaults for research engine
    setDefaultProviders(llmProvider, searchProvider);

    providersInitialized = true;
    logger.info("Research providers initialized successfully", {
      llmProvider: "OpenAI",
      searchProvider: searchProvider.getName(),
    });
  } catch (error: any) {
    logger.error("Failed to initialize providers", {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

const gResearchQueueMutex = new Mutex();
interface PolledProject {
  userId: string;
  project: Project;
  projectRef: any;
  isRetry: boolean;
}

/**
 * Research Job
 * Handles both pre-runs (ahead of delivery time) AND retries (already due)
 * Any project without prepared results gets researched
 */
async function runResearchJob(scheduledJobNumber: number): Promise<void> {
  // Ensure providers are initialized
  await initializeProviders();

  // import db
  const { db } = await import("core");
  const now = Date.now();
  const checkWindowMs = getCheckWindowMs();
  const prerunMaxTime = now + checkWindowMs;

  // polls projects that need research using collection group queries
  // This queries ALL projects across ALL users in just 2 queries (instead of 2N+1)
  const pollResearchProjects = async (): Promise<Array<PolledProject>> => {
    let projectsToRun: Array<PolledProject> = [];

    // Query 1: Pre-run projects (upcoming within check window)
    const prerunSnapshot = await db
      .collectionGroup("projects")
      .where("status", "in", ["active", "error"])
      .where("preparedDeliveryLogId", "==", null)
      .where("nextRunAt", ">", now)
      .where("nextRunAt", "<=", prerunMaxTime)
      .get();

    for (const projectDoc of prerunSnapshot.docs) {
      const project = {
        id: projectDoc.id,
        ...projectDoc.data(),
      } as Project;

      projectsToRun.push({
        userId: project.userId,
        project,
        isRetry: false,
        projectRef: projectDoc.ref,
      } as PolledProject);
    }

    // Query 2: Retry projects (already due but no prepared results)
    const retrySnapshot = await db
      .collectionGroup("projects")
      .where("status", "in", ["active", "error"])
      .where("preparedDeliveryLogId", "==", null)
      .where("nextRunAt", "<=", now)
      .get();

    for (const projectDoc of retrySnapshot.docs) {
      const project = {
        id: projectDoc.id,
        ...projectDoc.data(),
      } as Project;

      // Check if already in list from pre-run query to avoid duplicates
      const alreadyQueued = projectsToRun.some(
        (p) => p.project.id === project.id && p.userId === project.userId
      );
      if (!alreadyQueued) {
        projectsToRun.push({
          userId: project.userId,
          project,
          isRetry: true,
          projectRef: projectDoc.ref,
        } as PolledProject);
      }
    }

    return projectsToRun;
  };

  // Marks all polled projects as running
  const markPolledProjectsAsRunning = async (
    polledProjects: Array<PolledProject>
  ) => {
    for (const polledProject of polledProjects) {
      await polledProject.projectRef.update({
        status: "running",
        updatedAt: Date.now(),
      });
    }
  };

  // executes research for a single project
  const executeResearch = async (polledProject: PolledProject) => {
    const { executeResearchForProject } = await import("core");
    const { userId, project, isRetry, projectRef } = polledProject;

    // Update project status to running
    await projectRef.update({
      status: "running",
      researchStartedAt: Date.now(),
      updatedAt: Date.now(),
    });

    logger.info("Starting research execution", {
      userId,
      projectId: project.id,
      projectTitle: project.title,
      isRetry,
    });

    // Execute research
    const result = await executeResearchForProject(userId, project.id);

    if (!result.success || !result.deliveryLogId) {
      throw new Error(result.error || "Research execution failed");
    }

    logger.info("Research execution completed successfully", {
      userId,
      projectId: project.id,
      deliveryLogId: result.deliveryLogId,
      durationMs: result.durationMs,
    });

    // Success - prepare project for delivery
    // The Delivery Job will update nextRunAt AFTER the email is sent successfully.
    await projectRef.update({
      status: project.frequency === "once" ? "paused" : "active",
      researchStartedAt: null,
      lastError: null,
      preparedDeliveryLogId: result.deliveryLogId,
      preparedAt: Date.now(),
      deliveredAt: null,
      updatedAt: Date.now(),
    });

    logger.info(`${isRetry ? "Retry" : "Pre-run"} research succeeded`, {
      userId,
      projectId: project.id,
      deliveryLogId: result.deliveryLogId,
    });
  };

  try {
    await gResearchQueueMutex.runExclusive(async () => {
      logger.debug("Running research job", {
        jobNumber: scheduledJobNumber,
        checkingFrom: new Date(now).toISOString(),
        checkingUntil: new Date(prerunMaxTime).toISOString(),
        windowMinutes: checkWindowMs / 60000,
      });

      // poll research projects
      let projectsToRun: Array<PolledProject> = await pollResearchProjects();

      if (projectsToRun.length === 0) {
        logger.debug("No projects need research");
        return;
      }

      // avoid race conditions if a project takes longer than a minute to run...
      await markPolledProjectsAsRunning(projectsToRun);

      const prerunCount = projectsToRun.filter((p) => !p.isRetry).length;
      const retryCount = projectsToRun.filter((p) => p.isRetry).length;

      logger.info(`Researching ${projectsToRun.length} projects`, {
        prerun: prerunCount,
        retry: retryCount,
      });

      // execute research for each project
      await Promise.all(
        projectsToRun.map(async (polledProject) => {
          try {
            await executeResearch(polledProject);
          } catch (error: any) {
            logger.error("Research execution error", {
              userId: polledProject.userId,
              projectId: polledProject.project.id,
              isRetry: polledProject.isRetry,
              error: error.message,
              stack: error.stack,
            });

            // Update project with error status
            try {
              await polledProject.projectRef.update({
                status: "error",
                lastError: error.message,
                researchStartedAt: null,
                updatedAt: Date.now(),
              });

              logger.info("Project marked as error", {
                userId: polledProject.userId,
                projectId: polledProject.project.id,
                error: error.message,
              });
            } catch (updateError: any) {
              logger.error("Failed to update project error status", {
                userId: polledProject.userId,
                projectId: polledProject.project.id,
                error: updateError.message,
              });
            }
          }
        })
      );
    });
  } catch (error: any) {
    logger.error("Research job failed", {
      error: error.message,
      stack: error.stack,
    });
  }
}

const gDeliveryQueue = new Queue<DeliveryItem>();
interface DeliveryItem {
  userId: string;
  userRef: any;
  project: Project;
  projectRef: any;
  deliveryLogDoc: any;
}

/**
 * Delivery Job
 * Check for projects ready to deliver (have preparedDeliveryLogId)
 */
async function runDeliveryJob(scheduledJobNumber: number): Promise<void> {
  try {
    const { db } = await import("core");
    const now = Date.now();

    logger.debug("Running delivery job", {
      jobNumber: scheduledJobNumber,
    });

    // Use collection group query to find all projects ready for delivery
    // This queries ALL projects across ALL users in a single query
    const projectsSnapshot = await db
      .collectionGroup("projects")
      .where("preparedDeliveryLogId", "!=", null)
      .where("nextRunAt", "<=", now)
      .get();

    let projectsToDeliver: Array<{
      userId: string;
      userRef: any;
      project: Project;
      projectRef: any;
    }> = [];

    for (const projectDoc of projectsSnapshot.docs) {
      const project = {
        id: projectDoc.id,
        ...projectDoc.data(),
      } as Project;

      if (project.preparedDeliveryLogId) {
        const userRef = db.collection("users").doc(project.userId);
        projectsToDeliver.push({
          userId: project.userId,
          userRef,
          project,
          projectRef: projectDoc.ref,
        });
      }
    }

    if (projectsToDeliver.length === 0) {
      logger.debug("No projects ready for delivery");
      return;
    }

    logger.info(`Delivering results for ${projectsToDeliver.length} projects`);

    // Update delivery logs and projects
    for (const { userId, userRef, project, projectRef } of projectsToDeliver) {
      sendClientProjectReport(userId, userRef, project, projectRef);
    }
  } catch (error: any) {
    logger.error("Delivery job failed", {
      error: error.message,
      stack: error.stack,
    });
  }
}

async function sendClientProjectReport(
  userId: string,
  userRef: any,
  project: Project,
  projectRef: any
) {
  try {
    const deliveryLogSnapshot = await projectRef
      .collection("deliveryLogs")
      .where("status", "==", "pending")
      .get();
    if (deliveryLogSnapshot.docs.length === 0) {
      logger.warn("Project has no pending delivery log (s)", {
        userId,
        projectId: project.id,
      });
      return;
    }
    if (project.resultsDestination === "email") {
      for (const deliveryLogDoc of deliveryLogSnapshot.docs) {
        gDeliveryQueue.enqueue({
          userId,
          userRef,
          project,
          projectRef,
          deliveryLogDoc,
        });
      }
    }
  } catch (error: any) {
    logger.error("Delivery failed", {
      userId,
      projectId: project.id,
      error: error.message,
    });
  }
}

// for now we can only handle 2 emails a second before we hit rate limits
async function runDeliveryQueue() {
  const { db } = await import("core");
  const now = Date.now();
  for (let i = 0; i < 2 && gDeliveryQueue.isEmpty() === false; i++) {
    const deliveryItem = gDeliveryQueue.dequeue();
    const { userId, userRef, project, projectRef, deliveryLogDoc } =
      deliveryItem;
    try {
      // Load user (for email fallback)
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        logger.error("User not found", {
          userId,
          projectId: project.id,
          deliveryLogId: project.preparedDeliveryLogId,
        });
        return;
      }
      const userData = userDoc.data() as RelevxUserProfile;
      const userEmail = userData.email;

      // Send email if configured
      const deliveryEmail = project.deliveryConfig?.email?.address || userEmail;

      if (project.resultsDestination === "email" && deliveryEmail) {
        logger.info(`Sending report email to ${deliveryEmail}...`);
        const deliveryLog = deliveryLogDoc.data() as NewDeliveryLog;
        const deliveryLogRef = deliveryLogDoc.ref;

        try {
          const emailResult = await sendReportEmail(
            deliveryEmail,
            {
              title: deliveryLog.reportTitle,
              markdown: deliveryLog.reportMarkdown,
            },
            project.id,
            {
              summary: deliveryLog.reportSummary,
              resultCount: deliveryLog.stats?.includedResults,
              averageScore: deliveryLog.stats?.averageRelevancyScore
                ? Math.round(deliveryLog.stats.averageRelevancyScore)
                : undefined,
            }
          );

          if (emailResult.success) {
            console.log("Email sent successfully:", emailResult.id);

            // Update delivery log status from pending to success
            await deliveryLogRef.update({
              status: "success",
              deliveredAt: Date.now(),
            });

            const monthKey = kAnalyticsMonthlyDateKey(new Date());

            if (project.frequency === "once") {
              try {
                await incrementUserOneShotRun(db, userId, monthKey);
              } catch (analyticsErr: any) {
                logger.error("Failed to increment one-shot analytics", {
                  userId,
                  projectId: project.id,
                  monthKey,
                  error: analyticsErr?.message ?? String(analyticsErr),
                });
              }
              await projectRef.update({
                status: "paused",
                lastRunAt: now,
                preparedDeliveryLogId: null,
                nextRunAt: null,
                deliveredAt: now,
                updatedAt: Date.now(),
              });
              logger.info("Once project delivered and paused", {
                userId,
                projectId: project.id,
                deliveryLogId: project.preparedDeliveryLogId,
              });
            } else if (project.thisRunIsOneShot === true) {
              try {
                await incrementUserOneShotRun(db, userId, monthKey);
              } catch (analyticsErr: any) {
                logger.error("Failed to increment one-shot analytics", {
                  userId,
                  projectId: project.id,
                  monthKey,
                  error: analyticsErr?.message ?? String(analyticsErr),
                });
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
                updatedAt: Date.now(),
              });
              logger.info("Results delivered successfully (one-shot run)", {
                userId,
                projectId: project.id,
                deliveryLogId: project.preparedDeliveryLogId,
                nextRunAt: new Date(nextRunAt).toISOString(),
              });
            } else {
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
                updatedAt: Date.now(),
              });
              logger.info("Results delivered successfully", {
                userId,
                projectId: project.id,
                deliveryLogId: project.preparedDeliveryLogId,
                nextRunAt: new Date(nextRunAt).toISOString(),
              });
            }
          } else {
            // enqueue the delivery item again so it can be retried
            gDeliveryQueue.enqueue(deliveryItem);
            logger.error("Failed to send email:", emailResult.error);
          }
        } catch (emailError) {
          logger.error("Exception sending email:", emailError);
        }
      }
    } catch (error: any) {
      logger.error("Delivery failed", {
        userId,
        projectId: project.id,
        error: error.message,
      });
    }
  }
}

/**
 * Main scheduler job - runs every minute
 */
async function runSchedulerJob(scheduledJobNumber: number): Promise<void> {
  logger.debug("Scheduler job started");
  const startTime = Date.now();

  try {
    // Run both jobs in parallel
    // Research job handles both pre-runs and retries
    // Delivery job handles marking prepared results as sent and sending emails
    await Promise.all([
      runResearchJob(scheduledJobNumber),
      runDeliveryJob(scheduledJobNumber),
    ]);

    const duration = Date.now() - startTime;
    logger.debug("Scheduler job completed", {
      durationMs: duration,
    });
  } catch (error: any) {
    logger.error("Scheduler job failed", {
      error: error.message,
      stack: error.stack,
    });
  }
}

/**
 * Start the scheduler service
 */
async function startScheduler(): Promise<void> {
  logger.info("Starting Research Scheduler Service");

  // Load secrets from AWS Secrets Manager if available
  await loadAwsSecrets("relevx-backend-env");

  // Determine required search API key based on config
  const config = loadConfig();
  const searchProviderName = config.search?.provider || "serper";
  const searchEnvVar =
    searchProviderName === "brave" ? "BRAVE_SEARCH_API_KEY" : "SERPER_API_KEY";

  // Validate required environment variables
  const requiredEnvVars = [
    "OPENAI_API_KEY",
    searchEnvVar,
    "FIREBASE_SERVICE_ACCOUNT_JSON",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    logger.error("Missing required environment variables", {
      missing: missingVars,
    });
    process.exit(1);
  }

  // Firebase Admin is automatically initialized by core package when imported
  logger.info("Firebase Admin SDK will be used (initialized by core package)");

  // Initialize providers at startup
  try {
    await initializeProviders();
  } catch (error: any) {
    logger.error("Failed to initialize providers, cannot start scheduler", {
      error: error.message,
    });
    process.exit(1);
  }

  // Check if scheduler is enabled
  if (process.env.SCHEDULER_ENABLED === "false") {
    logger.warn("Scheduler is disabled by configuration");
    return;
  }

  // Run once at startup (optional, can be disabled)
  if (process.env.RUN_ON_STARTUP !== "false") {
    logger.info("Running initial scheduler job");
    await runSchedulerJob(0);
  }

  // Set up cron job to run every minute
  // Cron format: * * * * * = every minute
  const cronExpression = "* * * * *";

  logger.info("Setting up cron job", { schedule: cronExpression });

  let scheduledJobNumber = 0;
  cron.schedule(cronExpression, async () => {
    scheduledJobNumber = scheduledJobNumber + 1;
    await runSchedulerJob(scheduledJobNumber);
  });

  // Run delivery queue every 1.2second
  const maxConcurrentDeliveryJobs = 1;
  let currentConcurrentDeliveryJobs = 0;
  setInterval(async () => {
    currentConcurrentDeliveryJobs = currentConcurrentDeliveryJobs + 1;
    if (currentConcurrentDeliveryJobs > maxConcurrentDeliveryJobs) {
      return;
    }
    await runDeliveryQueue();
    currentConcurrentDeliveryJobs = currentConcurrentDeliveryJobs - 1;
  }, 1200); // 1 minute

  logger.info("Scheduler service started successfully", {
    schedule: "Every minute",
    checkWindowMinutes: parseInt(
      process.env.SCHEDULER_CHECK_WINDOW_MINUTES || "15",
      10
    ),
    timezone: process.env.SCHEDULER_TIMEZONE || "UTC",
    providers: {
      llm: "OpenAI",
      search: searchProviderName,
    },
  });

  // Keep the process running
  process.on("SIGINT", () => {
    logger.info("Received SIGINT, shutting down gracefully");
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    logger.info("Received SIGTERM, shutting down gracefully");
    process.exit(0);
  });
}

// Start the scheduler
startScheduler().catch((error) => {
  logger.error("Failed to start scheduler", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
