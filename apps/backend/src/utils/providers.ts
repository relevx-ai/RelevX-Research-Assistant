/**
 * Shared provider initialization for research execution.
 *
 * Lazily initializes the OpenRouter LLM client and search provider
 * on first call, then re-uses the same instances for every subsequent
 * research job.
 */

import {
  initializeOpenRouter,
  SerperSearchProvider,
  BraveSearchProvider,
  setDefaultSearchProvider,
  loadConfig,
} from "core";

let initialized = false;

export async function initializeProviders(): Promise<void> {
  if (initialized) return;

  const config = loadConfig();
  const searchProviderName = config.search?.provider || "serper";

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  const searchKey =
    searchProviderName === "brave"
      ? process.env.BRAVE_SEARCH_API_KEY
      : process.env.SERPER_API_KEY;
  const searchKeyName =
    searchProviderName === "brave" ? "BRAVE_SEARCH_API_KEY" : "SERPER_API_KEY";

  if (!openrouterKey || !searchKey) {
    throw new Error(
      `Missing required API keys (OPENROUTER_API_KEY or ${searchKeyName})`
    );
  }

  initializeOpenRouter(openrouterKey);
  const searchProvider =
    searchProviderName === "brave"
      ? new BraveSearchProvider(searchKey)
      : new SerperSearchProvider({ apiKey: searchKey });

  setDefaultSearchProvider(searchProvider);
  initialized = true;
}
