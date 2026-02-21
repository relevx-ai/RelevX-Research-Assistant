import fp from "fastify-plugin";

// Firebase-backed API key authentication with short TTL caching.
export default fp(async (app: any) => {
  app.addHook("preHandler", async (req: any, _rep: any) => {
    // Allow unauthenticated health checks so uptime probes don't require auth.
    if (req.routeOptions.url === "/healthz" || req.routeOptions.url === "/api/v1/products/plans") {
      return;
    }

    // Bull Board serves HTML/JS/CSS that browsers fetch without custom headers,
    // so we skip API-key auth here. Secure access via SSH tunnel or firewall instead.
    if (req.routeOptions.url?.startsWith("/admin/queues")) {
      return;
    }

    // Admin routes require a separate API key (not Firebase user auth).
    if (req.routeOptions.url?.startsWith("/admin/")) {
      const apiKey = req.headers?.["x-admin-api-key"] as string;
      const expectedKey = process.env.ADMIN_API_KEY;

      if (!expectedKey) {
        req.log.error("ADMIN_API_KEY not configured — admin routes are disabled");
        const err: any = new Error("Admin access unavailable");
        err.statusCode = 503;
        throw err;
      }

      if (!apiKey || apiKey !== expectedKey) {
        const err: any = new Error("Unauthorized");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
      return;
    }

    const idToken = req.headers?.["authorization"] as string;

    // Branch: Firebase Auth JWT
    if (idToken) {
      try {
        const res = await app.introspectIdToken(idToken);
        if (!res?.user?.uid) {
          const err: any = new Error("Missing or invalid token");
          err.statusCode = 401;
          err.code = "unauthorized";
          throw err;
        }
        req.user = res.user;
        try { req.log.debug({ uid: res.user.uid }, "auth: firebase token verified"); } catch { }
        return;
      } catch (e) {
        try { req.log.warn({ err: e && (e as any).message }, "auth: firebase token verification failed"); } catch { }
        const err: any = new Error("Missing or invalid token");
        err.statusCode = 401;
        err.code = "unauthorized";
        throw err;
      }
    }
  });
});