import fp from "fastify-plugin";
import Stripe from "stripe";

export default fp(async (app) => {
  // Initialize Stripe client from FASTIFY_PUBLIC_STRIPE_SECRET_KEY environment variable
  const stripeSecretKey = process.env.FASTIFY_PUBLIC_STRIPE_SECRET_KEY;

  if (!stripeSecretKey) {
    throw new Error(
      "FASTIFY_PUBLIC_STRIPE_SECRET_KEY not found in environment variables. Stripe is required."
    );
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-02-24.acacia",
  });

  app.decorate("stripe", stripe);

  try {
    const stripeKeyMode = stripeSecretKey.startsWith("sk_test_")
      ? "test"
      : stripeSecretKey.startsWith("sk_live_")
        ? "live"
        : "unknown";
    const account = await stripe.accounts.retrieve();
    app.log.info(
      {
        stripeKeyMode,
        stripeAccountType: account.type,
        stripeAccountCountry: account.country,
        stripeChargesEnabled: account.charges_enabled,
      },
      "Stripe initialized successfully"
    );
  } catch (err) {
    app.log.warn({ err }, "Stripe initialized, but failed to retrieve account");
  }
});
