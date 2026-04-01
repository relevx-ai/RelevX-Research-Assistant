import { Plan, RelevxUserProfile } from "core";
import type { FastifyPluginAsync } from "fastify";
import type Stripe from "stripe";
import { isUserSubscribed } from "../utils/billing.js";
import { getPlans } from "./products.js";

/** Webhook payloads may send Stripe resource IDs as strings or expanded objects. */
function stripeObjectId(
  value:
    | string
    | Stripe.Customer
    | Stripe.Subscription
    | Stripe.DeletedCustomer
    | null
    | undefined
): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const db = firebase.db;
  const stripe = app.stripe as Stripe;
  const remoteConfig = firebase.remoteConfig;

  app.get("/healthz", async (_req, rep) => {
    const sk = process.env.FASTIFY_PUBLIC_STRIPE_SECRET_KEY ?? "";
    const stripeMode = sk.startsWith("sk_test_")
      ? "test"
      : sk.startsWith("sk_live_")
        ? "live"
        : "unknown";
    return rep.send({ ok: true, stripeMode });
  });

  app.post(
    "/checkout-completed",
    {
      config: {
        rawBody: true,
      },
    },
    async (request, rep) => {
      const sig = request.headers["stripe-signature"] as string;

      let event;
      try {
        if (!request.rawBody) {
          throw new Error("Missing raw body");
        }
        event = stripe.webhooks.constructEvent(
          request.rawBody,
          sig,
          process.env.STRIPE_WEBHOOK_SIGNING_SECRET!
        );
      } catch (err: any) {
        request.log.error(err);
        return rep.code(400).send(`Webhook Error: ${err.message}`);
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;

        const subscriptionId = stripeObjectId(session.subscription);
        const customerId = stripeObjectId(session.customer);
        const metadata = session.metadata;

        if (!metadata) {
          app.log.error("No Metadata found in Stripe Session Event");
        } else if (!metadata.userId) {
          app.log.error("No UserId in Metadata Stripe Session Event");
        } else if (!metadata.planId) {
          app.log.error("No Plan ID in Metadata Stripe Session Event");
        }

        if (metadata && metadata.planId && metadata.userId) {
          const userRef = db.collection("users").doc(metadata.userId);
          const userDoc = await userRef.get();

          const planData = (await getPlans(remoteConfig)).find(
            (plan) => plan.id === metadata.planId
          ) as Plan | undefined;
          if (!planData) {
            app.log.error(
              { planId: metadata.planId },
              "Plan not found for checkout.session.completed"
            );
          } else if (!subscriptionId || !customerId) {
            app.log.error(
              {
                subscriptionId,
                customerId,
                sessionId: session.id,
                mode: session.mode,
              },
              "checkout.session.completed missing subscription or customer id"
            );
          } else if (!userDoc.exists) {
            app.log.error(
              { userId: metadata.userId },
              "User not found for checkout.session.completed"
            );
          } else {
            const userData = userDoc.data() as RelevxUserProfile;

            if (userData.billing.stripeCustomerId !== customerId) {
              app.log.warn(
                {
                  firestoreCustomerId: userData.billing.stripeCustomerId,
                  sessionCustomerId: customerId,
                  userId: metadata.userId,
                },
                "Stripe session customer differs from Firestore; using session customer"
              );
            }

            const freeTrailRedeemed =
              userData.freeTrailRedeemed || planData.infoName === "Free Trial";

            await userRef.update({
              planId: metadata.planId,
              freeTrailRedeemed,
              updatedAt: new Date().toISOString(),
              "billing.stripeCustomerId": customerId,
              "billing.stripeSubscriptionId": subscriptionId,
            });

            const verifyProfile: RelevxUserProfile = {
              ...userData,
              planId: metadata.planId,
              freeTrailRedeemed,
              billing: {
                ...userData.billing,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
              },
            };
            try {
              const ok = await isUserSubscribed(verifyProfile, stripe);
              if (!ok) {
                app.log.warn(
                  { subscriptionId, userId: metadata.userId },
                  "Post-checkout subscription verification did not report active/trialing (Firestore still updated)"
                );
              }
            } catch (verifyErr) {
              app.log.warn(
                { verifyErr, subscriptionId, userId: metadata.userId },
                "Post-checkout subscription verification threw (Firestore still updated)"
              );
            }

            app.log.info(
              {
                event: "checkout.session.completed",
                userId: metadata.userId,
                planId: metadata.planId,
                subscriptionId,
                customerId,
              },
              "Firestore user plan updated after checkout"
            );
          }
        }
      }

      return rep.send({ received: true });
    }
  );
};

export default routes;
