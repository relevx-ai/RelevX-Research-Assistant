export interface Plan {
  id: string;
  infoName: string;
  infoStripeSubscriptionId: string;
  settingsMaxDailyRuns: number;
}

export interface PlanInfo
  extends Omit<
    Plan,
    | "infoStripeSubscriptionId"
  > {}

