import type { FastifyPluginAsync } from "fastify";
import type {
  ImproveProjectDescriptionRequest,
  ImproveProjectDescriptionResponse,
} from "core";

// API key management routes: create/list/revoke. All routes rely on the auth
// plugin to populate req.userId and tenant authorization.
const routes: FastifyPluginAsync = async (app) => {
  const aiInterface = app.aiInterface;

  app.get("/healthz", async (_req, rep) => {
    return rep.send({ ok: true });
  });

  app.addHook("onClose", async () => {});

  app.post(
    "/improve-project-description",
    { preHandler: [app.rlPerRoute(5)] },
    async (req: any, rep) => {
      try {
        const userId = req.user?.uid;
        if (!userId) {
          return rep
            .status(401)
            .send({ error: { message: "Unauthenticated" } });
        }

        const request = req.body as ImproveProjectDescriptionRequest;
        if (!request.description) {
          return rep
            .status(400)
            .send({ error: { message: "Description is required" } });
        }
        const response = await aiInterface.query([
          {
            role: "system",
            content: `You are an expert at refining research project descriptions into clear, search-optimized summaries. The output will be used by AI to generate effective web search queries, so prioritize specific terminology, key entities, and searchable concepts over vague or generic language.`,
          },
          {
            role: "user",
            content: `Improve the following project description for research and search query generation.

Original Description:
${request.description}

Requirements:
- Extract and emphasize specific topics, technologies, companies, or concepts that should be researched
- Use precise, searchable terminology (e.g., "React Server Components" not "new React features")
- Write 2-4 concise bullet points, each representing a distinct research focus area
- Avoid filler phrases like "This project aims to" or "The goal is to"
- Each bullet should be independently searchable as a research topic

Return ONLY a JSON object with bullet points separated by newlines:
{
  "description": "- First research focus\n- Second research focus\n- Third research focus"
}`,
          },
        ]);

        // verify response
        if (!response.description) {
          return rep.status(400).send({
            error: { message: "Failed to generate a ai description" },
          });
        }

        const finalDescription = Array.isArray(response.description)
          ? response.description.join("\n")
          : String(response.description);

        return rep.status(200).send({
          description: finalDescription,
        } as ImproveProjectDescriptionResponse);
      } catch (err: any) {
        const isDev = process.env.NODE_ENV !== "production";
        const detail = err instanceof Error ? err.message : String(err);
        req.log?.error({ detail }, "/ai/improve-project-description failed");
        return rep.status(500).send({
          error: {
            code: "internal_error",
            message: "Improve project description failed",
            ...(isDev ? { detail } : {}),
          },
        });
      }
    }
  );
};

export default routes;
