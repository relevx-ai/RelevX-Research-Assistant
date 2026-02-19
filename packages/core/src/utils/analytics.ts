import type { UserAnalyticsDocument } from "../models/analytics";
import type { DeliveryStats } from "../models/delivery-log";

const kAnalyticsCollection = "analytics/research-v1/";
export const kAnalyticsCollectionTopDown = (dateKey: string) =>
  `${kAnalyticsCollection}topdown/${dateKey}`;
export const kAnalyticsUserCollection = (userId: string, dateKey: string) =>
  `users/${userId}/analytics-v1/${dateKey}`;
/** Document path for per-user monthly analytics (e.g. one-shot run count). Firestore doc paths need even segments. */
export const kAnalyticsUserMonthlyDoc = (userId: string, monthKey: string) =>
  `users/${userId}/analytics-v1/${monthKey}`;

export const kAnalyticsDailyDateKey = (date: Date): string =>
  date.toISOString().substring(0, 10);
export const kAnalyticsMonthlyDateKey = (date: Date): string =>
  date.toISOString().substring(0, 7);

export const getUserAnalytics = async (
  db: any,
  userId: string,
  date: Date = new Date()
): Promise<UserAnalyticsDocument> => {
  const doc = await db
    .doc(kAnalyticsUserCollection(userId, kAnalyticsDailyDateKey(date)))
    .get();
  if (!doc.exists)
    return {
      num_completed_daily_research_projects: [],
    } as UserAnalyticsDocument;
  return doc.data() as UserAnalyticsDocument;
};

/**
 * Get the number of one-shot runs (Once + Run Now) for the user in the given month.
 */
export async function getUserOneShotCount(
  db: any,
  userId: string,
  monthKey: string
): Promise<number> {
  const ref = db.doc(kAnalyticsUserMonthlyDoc(userId, monthKey));
  const doc = await ref.get();
  if (!doc.exists) return 0;
  const data = doc.data();
  return (data?.num_one_shot_runs as number) ?? 0;
}

/**
 * Increment the user's one-shot run count for the given month (transactional).
 */
export async function incrementUserOneShotRun(
  db: any,
  userId: string,
  monthKey: string
): Promise<void> {
  const ref = db.doc(kAnalyticsUserMonthlyDoc(userId, monthKey));
  await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(ref);
    const current = doc.exists ? (doc.data()?.num_one_shot_runs as number) ?? 0 : 0;
    transaction.set(ref, { num_one_shot_runs: current + 1 }, { merge: true });
  });
}

export type PlanType = "free" | "paid";

export type RecurringFrequency = "daily" | "weekly" | "monthly";

const RECURRING_FREQUENCIES: RecurringFrequency[] = ["daily", "weekly", "monthly"];

/**
 * Update active project count for top-down analytics.
 * Call with delta +1 when a project becomes active, -1 when it becomes inactive.
 * Only for daily/weekly/monthly projects (not "once").
 */
export async function updateActiveProjectCount(
  db: any,
  delta: 1 | -1,
  frequency: RecurringFrequency,
  planType: PlanType
): Promise<void> {
  const dateKey = kAnalyticsMonthlyDateKey(new Date());
  const ref = db.doc(kAnalyticsCollectionTopDown(dateKey));
  const field = `active_${frequency}` as const;

  await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(ref);
    const data = doc.exists ? doc.data() : {};
    const planData = data[planType] ?? {};
    const current = (planData[field] as number) ?? 0;
    const next = Math.max(0, current + delta);
    transaction.set(ref, { [planType]: { ...planData, [field]: next } }, { merge: true });
  });
}

/**
 * Record run metrics for top-down analytics after a delivery completes.
 * Updates both plan-specific metrics (free/paid) and legacy aggregate fields
 * (num_completed_daily_research, num_completed_monthly_research) for consistency.
 */
export async function recordRunMetrics(
  db: any,
  planType: PlanType,
  stats: DeliveryStats
): Promise<void> {
  const now = new Date();
  const monthKey = kAnalyticsMonthlyDateKey(now);
  const dailyKey = kAnalyticsDailyDateKey(now);
  const ref = db.doc(kAnalyticsCollectionTopDown(monthKey));

  const durationMs = stats.researchDurationMs ?? 0;
  const costUsd = stats.estimatedCostUsd ?? 0;
  const searchCalls = stats.searchQueriesUsed ?? 0;

  await db.runTransaction(async (transaction: any) => {
    const doc = await transaction.get(ref);
    const data = doc.exists ? doc.data() : {};
    const planData = data[planType] ?? {};
    const sumDuration = ((planData.sum_research_duration_ms as number) ?? 0) + durationMs;
    const sumCost = ((planData.sum_estimated_cost_usd as number) ?? 0) + costUsd;
    const sumSearch = ((planData.sum_search_api_calls as number) ?? 0) + searchCalls;
    const runCount = ((planData.run_count as number) ?? 0) + 1;
    const avgDuration = runCount > 0 ? sumDuration / runCount : 0;
    const avgCost = runCount > 0 ? sumCost / runCount : 0;
    const avgSearch = runCount > 0 ? sumSearch / runCount : 0;

    const dailyResearch = (data.num_completed_daily_research as Record<string, number>) ?? {};
    const monthlyResearch = (data.num_completed_monthly_research as number) ?? 0;

    transaction.set(
      ref,
      {
        [planType]: {
          ...planData,
          sum_research_duration_ms: sumDuration,
          sum_estimated_cost_usd: sumCost,
          sum_search_api_calls: sumSearch,
          run_count: runCount,
          avg_research_duration_ms: avgDuration,
          avg_estimated_cost_usd: avgCost,
          avg_search_api_calls: avgSearch,
        },
        num_completed_daily_research: {
          ...dailyResearch,
          [dailyKey]: (dailyResearch[dailyKey] ?? 0) + 1,
        },
        num_completed_monthly_research: monthlyResearch + 1,
      },
      { merge: true }
    );
  });
}

/**
 * Get active projects by frequency (on-demand computation).
 * Queries all active/running projects, batches user lookups for planId, and returns counts by plan.
 */
export async function getActiveProjectsByFrequency(
  db: any,
  getFreePlanId: () => string
): Promise<{
  free: { active_daily: number; active_weekly: number; active_monthly: number };
  paid: { active_daily: number; active_weekly: number; active_monthly: number };
}> {
  const snapshot = await db
    .collectionGroup("projects")
    .where("status", "in", ["active", "running"])
    .get();

  const userIds = new Set<string>();
  const projects: Array<{ frequency: string; userId: string }> = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const frequency = data.frequency as string;
    const userId = data.userId as string;
    if (!RECURRING_FREQUENCIES.includes(frequency as RecurringFrequency)) continue;
    userIds.add(userId);
    projects.push({ frequency, userId });
  }

  const userPlanMap = new Map<string, PlanType>();
  for (const uid of userIds) {
    const userDoc = await db.collection("users").doc(uid).get();
    const planId = userDoc.exists ? (userDoc.data()?.planId as string) : null;
    userPlanMap.set(uid, planId === getFreePlanId() ? "free" : "paid");
  }

  const result = {
    free: { active_daily: 0, active_weekly: 0, active_monthly: 0 },
    paid: { active_daily: 0, active_weekly: 0, active_monthly: 0 },
  };

  for (const { frequency, userId } of projects) {
    const planType = userPlanMap.get(userId) ?? "free";
    const key = `active_${frequency}` as keyof typeof result.free;
    result[planType][key]++;
  }

  return result;
}
