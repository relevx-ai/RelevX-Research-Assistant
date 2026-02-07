import { UserAnalyticsDocument } from "core";

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
