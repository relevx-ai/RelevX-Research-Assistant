/**
 * Provider Factory Functions
 *
 * Centralized search provider creation and initialization.
 */

import type { SearchProvider } from "./interfaces/search-provider";
import { BraveSearchProvider } from "./services/search/brave-provider";
import { SerperSearchProvider } from "./services/search/serper-provider";

/**
 * Search Provider types
 */
export type SearchProviderType =
  | "brave"
  | "serper"
  | "google"
  | "bing"
  | "scrapingbee"
  | "custom";

/**
 * Search Provider configuration
 */
export interface SearchProviderConfig {
  provider: SearchProviderType;
  apiKey: string;
  customProvider?: SearchProvider; // For custom implementations
}

/**
 * Create a search provider from configuration
 */
export function createSearchProvider(
  config: SearchProviderConfig
): SearchProvider {
  switch (config.provider) {
    case "brave":
      return new BraveSearchProvider(config.apiKey);

    case "serper":
      return new SerperSearchProvider({ apiKey: config.apiKey });

    case "google":
      throw new Error(
        "Google Search provider not yet implemented. Use 'brave' or provide a custom provider."
      );

    case "bing":
      throw new Error(
        "Bing Search provider not yet implemented. Use 'brave' or provide a custom provider."
      );

    case "scrapingbee":
      throw new Error(
        "ScrapingBee provider not yet implemented. Use 'brave' or provide a custom provider."
      );

    case "custom":
      if (!config.customProvider) {
        throw new Error(
          "Custom search provider specified but not provided in config.customProvider"
        );
      }
      return config.customProvider;

    default:
      throw new Error(`Unknown search provider type: ${config.provider}`);
  }
}
