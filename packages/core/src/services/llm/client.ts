/**
 * OpenRouter client initialization and management
 *
 * Uses the OpenAI SDK with baseURL override to route all LLM calls
 * through OpenRouter (OpenAI-API-compatible).
 */

import OpenAI from "openai";

// OpenRouter client instance
let openrouterClient: OpenAI | null = null;

/**
 * Initialize the OpenRouter client
 * Must be called before using any other functions
 */
export function initializeOpenRouter(apiKey: string): void {
  openrouterClient = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://relevx.app",
      "X-Title": "RelevX Research Assistant",
    },
  });
}

/**
 * Get the OpenRouter client instance
 */
export function getClient(): OpenAI {
  if (!openrouterClient) {
    throw new Error(
      "OpenRouter client not initialized. Call initializeOpenRouter() first."
    );
  }
  return openrouterClient;
}
