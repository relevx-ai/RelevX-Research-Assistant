/**
 * URL normalization and deduplication utilities
 */

import type { BraveSearchResult, BraveSearchResponse } from "./types";
import { normalizeUrl } from "../../utils/deduplication";

export { normalizeUrl };

/**
 * Deduplicate search results across multiple responses
 */
export function deduplicateResults(
  responses: BraveSearchResponse[],
  alreadyProcessedUrls?: Set<string>
): BraveSearchResult[] {
  const seenUrls = new Set<string>(alreadyProcessedUrls || []);
  const uniqueResults: BraveSearchResult[] = [];

  for (const response of responses) {
    for (const result of response.results) {
      const normalizedUrl = normalizeUrl(result.url);

      if (!seenUrls.has(normalizedUrl)) {
        seenUrls.add(normalizedUrl);
        uniqueResults.push(result);
      }
    }
  }

  return uniqueResults;
}
