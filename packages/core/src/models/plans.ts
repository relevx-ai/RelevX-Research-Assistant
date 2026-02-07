/**
 * Plan as loaded from Firebase Remote Config "plans" JSON.
 * If settingsOneShotRunsPerMonth is missing, treat as 0 (no one-shot runs allowed).
 */
export interface Plan {
  id: string;
  precedence: number;
  infoName: string;
  infoDescription: string;
  infoStripeSubscriptionId: string;
  infoPerksHeader: string;
  infoPerks: string[];
  infoPrice: number;
  settingsMaxActiveProjects: number;
  /** Max one-shot runs (Once + Run Now) per user per month. Default 0 if missing. */
  settingsOneShotRunsPerMonth?: number;
}

export interface PlanInfo extends Omit<Plan, "infoStripeSubscriptionId"> {}

export interface FetchPlansResponse {
  ok: boolean;
  plans: PlanInfo[];
}
