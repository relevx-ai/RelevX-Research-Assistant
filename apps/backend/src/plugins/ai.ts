import fp from "fastify-plugin";

export default fp(async (app: any) => {
  const openrouterKey = process.env.OPENROUTER_API_KEY;

  if (!openrouterKey) {
    throw new Error("Missing required API key OPENROUTER_API_KEY");
  }

  // Import getClient from core — the OpenRouter client is already
  // initialized by the providers utility before plugins load.
  const { getClient } = await import("core");

  const aiInterface = {
    async query(
      messages: Array<{ role: string; content: string }>,
      temperature?: number
    ): Promise<any> {
      const client = getClient();

      const msgs = messages.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      }));

      const response = await client.chat.completions.create({
        model: "openai/gpt-4o-mini",
        temperature: temperature ?? 0.7,
        messages: msgs,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content in OpenRouter response");
      }

      return JSON.parse(content);
    },
  };

  app.decorate("aiInterface", aiInterface);
});
