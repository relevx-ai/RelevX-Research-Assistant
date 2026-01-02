import { Firestore } from "firebase-admin/firestore";
import { AnalyticsDocument, Plan, PlanInfo } from "core";

export const kCompletedResearchByUser = (
    userId: string,
) => `${userId}`;

async function update_topdown_analytics_completed_research(db: Firestore, numResearch: number = 1) {
    if (!db) {
        throw new Error("Firebase firestore not initialized");
    }

    const dateKey = new Date().toISOString().substring(0, 7); // YYYY-MM format
    const usageRef = db.doc(`analytics/research/v1/topdown/${dateKey}`);

    await db.runTransaction(async (transaction) => {
        const usageDoc = await transaction.get(usageRef);

        // Omit the monthly requests from the analytics document
        let data: Omit<AnalyticsDocument, "num_completed_daily_research" | "num_completed_research"> = {
            num_completed_monthly_research: 0,
        };
        if (usageDoc.exists) {
            data = usageDoc.data() as AnalyticsDocument;
        }

        const key = "num_completed_monthly_research";
        const num_completed_monthly_research = data[key];
        transaction.set(
            usageRef,
            {
                ...data,
                [key]: num_completed_monthly_research + numResearch,
            },
            { merge: true }
        );
    });
}

export async function check_and_increment_research_usage(
    onRun: () => Promise<boolean>,
    db: Firestore,
    userId: string,
    plan: Plan,
    numResearch: number = 1,
): Promise<boolean> {
    if (!db) {
        throw new Error("Firebase firestore not initialized");
    }

    const usageRef = db.doc(`analytics/research/v1/${userId}`);

    const result: any = await db.runTransaction(
        async (transaction) => {
            const dateKey = new Date().toISOString().substring(0, 10); // YYYY-MM-DD format

            const usageDoc = await transaction.get(usageRef);

            let data: Omit<AnalyticsDocument, "num_completed_monthly_research"> = {
                num_completed_daily_research: {},
                num_completed_research: 0,
            };
            if (usageDoc.exists) {
                data = usageDoc.data() as AnalyticsDocument;
            }

            const key = "num_completed_research";
            const completed_requests = data[key];

            const key_daily = "num_completed_daily_research";
            const completed_daily_requests = data[key_daily];

            const currentCount = completed_daily_requests[dateKey] || 0;

            if (currentCount + numResearch > plan.settingsMaxDailyRuns) {
                return false;
            }

            const success = await onRun();
            if (!success) {
                return false;
            }

            transaction.set(
                usageRef,
                {
                    ...data,
                    [key]: completed_requests + numResearch,
                    [key_daily]: {
                        ...completed_daily_requests,
                        [dateKey]: currentCount + numResearch,
                    },
                } as AnalyticsDocument,
                { merge: true }
            );

            // no need to wait for this to complete
            update_topdown_analytics_completed_research(db, numResearch);

            return true;
        }
    );

    return result;
}
