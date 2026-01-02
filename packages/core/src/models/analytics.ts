export interface AnalyticsDocument {
    // Number of completed research requests per day
    num_completed_daily_research: Record<string, number>;
    // Number of completed research requests
    num_completed_research: number;
    // Number of completed research requests per month
    num_completed_monthly_research: number;
    // analytics metrics
    [key: string]: any;
}