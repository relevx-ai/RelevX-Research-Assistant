export interface RelevxUserBilling {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
}

export interface BillingIntentResponse {
  ok: boolean;
  stripeSetupIntentClientSecret: string;
}

export interface BillingPaymentLinkResponse {
  ok: boolean;
  stripePaymentLink: string;
}

export interface BillingPortalLinkResponse {
  ok: boolean;
  stripeBillingPortalLink: string;
}

export interface ActivateFreeTrialRequest {
  planId: string;
}

export interface ActivateFreeTrialResponse {
  ok: boolean;
}
