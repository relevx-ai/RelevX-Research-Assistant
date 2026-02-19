import fp from "fastify-plugin";

export default fp(async (app: any) => {
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    throw new Error("Missing required API key OPENROUTER_API_KEY");
  }

  const { initializeOpenRouter, getClient, getModelConfig } = await import(
    "core"
  );

  // Ensure the OpenRouter client is initialized for non-worker code paths
  // (e.g. project description improvement, validation). The worker has its
  // own initializeProviders() call, but the main server process needs this.
  initializeOpenRouter(openrouterKey);

  const aiInterface = {
    async query(
      messages: Array<{ role: string; content: string }>,
      temperature?: number
    ): Promise<any> {
      const client = getClient();
      const { model, temperature: configTemp } =
        getModelConfig("queryGeneration");

      const msgs = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const response = await client.chat.completions.create({
        model,
        temperature: temperature ?? configTemp ?? 0.7,
        messages: msgs,
        response_format: { type: "json_object" },
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error("No content in OpenRouter response");
      }

      try {
        return JSON.parse(choice.message.content);
      } catch {
        throw new Error(
          "Failed to parse JSON from OpenRouter response"
        );
      }
    },
  };

  app.decorate("aiInterface", aiInterface);
});
