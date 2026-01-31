import { Firestore } from "firebase-admin/firestore";
import {
  TopDownAnalyticsDocument,
  kAnalyticsCollectionTopDown,
  kAnalyticsDailyDateKey,
  kAnalyticsMonthlyDateKey,
} from "core";

/**
 * Track completed research for admin analytics (optional metrics tracking)
 * This is purely for observability - no longer used for rate limiting
 */
export async function trackCompletedResearch(
  db: Firestore,
  numResearch: number = 1
): Promise<void> {
  if (!db) {
    return;
  }

  try {
    const monthKey = kAnalyticsMonthlyDateKey(new Date()); // YYYY-MM format
    const dailyKey = kAnalyticsDailyDateKey(new Date()); // YYYY-MM-DD format
    const usageRef = db.doc(kAnalyticsCollectionTopDown(monthKey));

    await db.runTransaction(async (transaction) => {
      const usageDoc = await transaction.get(usageRef);

      let data: TopDownAnalyticsDocument = {
        num_completed_monthly_research: 0,
      };
      if (usageDoc.exists) {
        data = usageDoc.data() as TopDownAnalyticsDocument;
      }

      const key = "num_completed_monthly_research";
      const num_completed_monthly_research = data[key] || 0;

      const keyDaily = "num_completed_daily_research";
      const num_completed_daily_research: Record<string, number> =
        data[keyDaily] || {};

      transaction.set(
        usageRef,
        {
          ...data,
          [key]: num_completed_monthly_research + numResearch,
          [keyDaily]: {
            ...num_completed_daily_research,
            [dailyKey]:
              (num_completed_daily_research[dailyKey] || 0) + numResearch,
          },
        } as TopDownAnalyticsDocument,
        { merge: false }
      );
    });
  } catch (error) {
    // Non-critical - just log and continue
    console.error("[Analytics] Failed to track research completion:", error);
  }
}
