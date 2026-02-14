/**
 * Shared provider initialization for research execution.
 *
 * Lazily initializes LLM and search providers on first call, then
 * re-uses the same instances for every subsequent research job.
 */

import {
  OpenAIProvider,
  SerperSearchProvider,
  BraveSearchProvider,
  setDefaultProviders,
  loadConfig,
} from "core";

let initialized = false;

export async function initializeProviders(): Promise<void> {
  if (initialized) return;

  const config = loadConfig();
  const searchProviderName = config.search?.provider || "serper";

  const openaiKey = process.env.OPENAI_API_KEY;
  const searchKey =
    searchProviderName === "brave"
      ? process.env.BRAVE_SEARCH_API_KEY
      : process.env.SERPER_API_KEY;
  const searchKeyName =
    searchProviderName === "brave" ? "BRAVE_SEARCH_API_KEY" : "SERPER_API_KEY";

  if (!openaiKey || !searchKey) {
    throw new Error(
      `Missing required API keys (OPENAI_API_KEY or ${searchKeyName})`
    );
  }

  const llmProvider = new OpenAIProvider(openaiKey);
  const searchProvider =
    searchProviderName === "brave"
      ? new BraveSearchProvider(searchKey)
      : new SerperSearchProvider({ apiKey: searchKey });

  setDefaultProviders(llmProvider, searchProvider);
  initialized = true;
}
