export interface AnalyticsDocument {
  // Array of completed research projects per day
  num_completed_daily_research_projects: string[];
  // Number of completed research requests per month
  num_completed_monthly_research: number;
  // Number of completed research requests per day
  num_completed_daily_research: Record<string, number>;
  // analytics metrics
  [key: string]: any;
}

/** Per-plan metrics for top-down analytics (free vs paid) */
export interface TopDownPlanMetrics {
  active_daily: number;
  active_weekly: number;
  active_monthly: number;
  sum_research_duration_ms: number;
  sum_estimated_cost_usd: number;
  sum_search_api_calls: number;
  run_count: number;
  avg_research_duration_ms: number;
  avg_estimated_cost_usd: number;
  avg_search_api_calls: number;
}

export interface TopDownAnalyticsDocument
  extends Omit<AnalyticsDocument, "num_completed_daily_research_projects"> {
  free?: Partial<TopDownPlanMetrics>;
  paid?: Partial<TopDownPlanMetrics>;
}

export interface UserAnalyticsDocument
  extends Omit<
    AnalyticsDocument,
    "num_completed_monthly_research" | "num_completed_daily_research"
  > {}
