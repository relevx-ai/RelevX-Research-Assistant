import { RelevxUserProfile } from "core";
import Stripe from "stripe";

export function getFreePlanId(): string {
  const id = process.env.FREE_PLAN_ID;
  if (!id) {
    throw new Error("FREE_PLAN_ID environment variable is not set");
  }
  return id;
}

export async function isUserSubscribed(
  user: RelevxUserProfile,
  stripe: Stripe
): Promise<boolean> {
  if (user.billing.stripeSubscriptionId !== "") {
    const subscription = await stripe.subscriptions.retrieve(
      user.billing.stripeSubscriptionId
    );
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      return false;
    }
    return true;
  }
  return false;
}
