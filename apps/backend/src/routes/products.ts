import type { FastifyPluginAsync } from "fastify";
import type { PlanInfo, Plan } from "core";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const firebase = app.firebase;
  const stripe = app.stripe;
  const remoteConfig = firebase.remoteConfig;

  async function getRemoteConfigParam(key: string) {
    try {
      const param = (await remoteConfig.getTemplate()).parameters[key];
      return param;
    } catch (error) {
      console.error("Error fetching remote config:", error);
    }
    return null;
  }

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.get(
    "/plans",
    { preHandler: [app.rlPerRoute(10)] },
    async (req: any, rep) => {
      try {
        const config = await getRemoteConfigParam("plans");
        const plansRaw = config?.defaultValue?.value;
        if (plansRaw) {
          const parsed = JSON.parse(plansRaw);
          const plansArray: Plan[] = Array.isArray(parsed)
            ? parsed
            : Object.values(parsed);

          if (!Array.isArray(plansArray)) {
            throw new Error("Parsed plans is not an array or valid object");
          }

          const plans: PlanInfo[] = await Promise.all(
            plansArray.map(async (plan) => {
              const data: Plan = plan;
              const { infoStripeSubscriptionId, ...planData } = data;
              const price = await stripe.prices.retrieve(
                infoStripeSubscriptionId
              );

              const unit_amount =
                data.infoName === "Free Trial" ? 0 : price?.unit_amount ?? 0;
              const newData: PlanInfo = {
                ...planData,
                infoPrice: unit_amount / 100,
              };
              return newData;
            })
          );

          plans.sort((a, b) => a.precedence - b.precedence);
          return rep.status(200).send({
            ok: true,
            plans,
          });
        }

        return rep.status(200).send({
          ok: false,
          plans: [],
        });
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/plans failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Failed to fetch plans",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );
};

export default routes;
