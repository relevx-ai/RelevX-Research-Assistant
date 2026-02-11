/**
 * Serper.dev Search Provider Implementation
 *
 * Serper.dev provides Google search results at 80% lower cost than Brave Search
 * Cost: $0.30-$1.00 per 1K queries vs Brave's $3-5 per 1K
 * Rate limit: 300 queries/second
 */

import type {
  SearchProvider,
  SearchFilters,
  SearchResultItem,
  SearchResponse,
} from "../../interfaces/search-provider";
import { getSearchCache, type SearchCache } from "../cache";

// Serper API configuration
const SERPER_API_URL = "https://serpapi.serper.dev/search";
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests (allows 300/sec)

interface SerperConfig {
  apiKey: string;
  timeout?: number;
  maxRetries?: number;
  enableCache?: boolean;
}

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  imageUrl?: string;
  position?: number;
  source?: string;
}

interface SerperResponse {
  searchParameters: {
    q: string;
    type?: string;
    num?: number;
  };
  organic?: SerperSearchResult[];
  news?: SerperSearchResult[];
  searchInformation?: {
    totalResults?: string;
  };
}

/**
 * Serper.dev Search implementation of SearchProvider
 */
export class SerperSearchProvider implements SearchProvider {
  private apiKey: string;
  private timeout: number;
  private maxRetries: number;
  private lastRequestTime: number = 0;
  private cache: SearchCache | null = null;
  private enableCache: boolean;

  constructor(config: SerperConfig) {
    this.apiKey = config.apiKey;
    this.timeout = config.timeout || 10000;
    this.maxRetries = config.maxRetries || 3;
    this.enableCache = config.enableCache ?? true;

    // Initialize cache if enabled
    if (this.enableCache) {
      try {
        this.cache = getSearchCache();
      } catch (error) {
        console.warn("Failed to initialize search cache:", error);
        this.cache = null;
      }
    }
  }

  /**
   * Apply rate limiting
   */
  private async applyRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Build freshness parameter for Serper API
   */
  private buildFreshnessParam(filters?: SearchFilters): string | undefined {
    if (!filters) return undefined;

    if (filters.freshness) {
      // Map our freshness values to Serper's time range format
      const freshnessMap: Record<string, string> = {
        pd: "d", // Past day
        pw: "w", // Past week
        pm: "m", // Past month
        py: "y", // Past year
      };
      return freshnessMap[filters.freshness] || filters.freshness;
    }

    if (filters.dateFrom && filters.dateTo) {
      // Convert ISO dates (YYYY-MM-DD) to Google custom date range format
      // Format: cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY
      const fromParts = filters.dateFrom.split("-"); // [YYYY, MM, DD]
      const toParts = filters.dateTo.split("-"); // [YYYY, MM, DD]

      // Build MM/DD/YYYY format (Google expects American date format)
      const cdMin = `${fromParts[1]}/${fromParts[2]}/${fromParts[0]}`;
      const cdMax = `${toParts[1]}/${toParts[2]}/${toParts[0]}`;

      // Return Google custom date range format
      // cdr:1 means custom date range enabled
      return `cdr:1,cd_min:${cdMin},cd_max:${cdMax}`;
    }

    if (filters.dateFrom) {
      // Calculate relative freshness from dateFrom
      const fromDate = new Date(filters.dateFrom);
      const now = new Date();
      const daysDiff = Math.floor(
        (now.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff <= 1) return "d"; // Past day
      if (daysDiff <= 7) return "w"; // Past week
      if (daysDiff <= 30) return "m"; // Past month
      if (daysDiff <= 365) return "y"; // Past year
    }

    return undefined;
  }

  /**
   * Build query with domain filters
   */
  private buildQueryWithFilters(
    query: string,
    filters?: SearchFilters
  ): string {
    let modifiedQuery = query;

    // Add site filters to query
    if (filters?.includeDomains && filters.includeDomains.length > 0) {
      const siteFilters = filters.includeDomains
        .map((domain) => `site:${domain}`)
        .join(" OR ");
      modifiedQuery = `${modifiedQuery} (${siteFilters})`;
    }

    if (filters?.excludeDomains && filters.excludeDomains.length > 0) {
      const excludeFilters = filters.excludeDomains
        .map((domain) => `-site:${domain}`)
        .join(" ");
      modifiedQuery = `${modifiedQuery} ${excludeFilters}`;
    }

    return modifiedQuery;
  }

  /**
   * Convert Serper result to generic SearchResultItem
   */
  private convertResult(serperResult: SerperSearchResult): SearchResultItem {
    return {
      title: serperResult.title,
      url: serperResult.link,
      description: serperResult.snippet,
      publishedDate: serperResult.date,
      thumbnail: serperResult.imageUrl
        ? {
            src: serperResult.imageUrl,
          }
        : undefined,
      meta: {
        position: serperResult.position,
        source: serperResult.source,
      },
    };
  }

  /**
   * Execute a single search with retry logic
   */
  private async searchWithRetry(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.executeSearch(query, filters);
      } catch (error) {
        lastError = error as Error;
        console.warn(
          `Serper search attempt ${attempt}/${this.maxRetries} failed for query "${query}":`,
          error
        );

        if (attempt < this.maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to search after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Execute a single search request
   */
  private async executeSearch(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    await this.applyRateLimit();

    const modifiedQuery = this.buildQueryWithFilters(query, filters);
    const freshness = this.buildFreshnessParam(filters);

    const requestBody: any = {
      q: modifiedQuery,
      num: filters?.count || 20,
    };

    // Add optional parameters
    if (freshness) {
      // Custom date ranges already have cdr: prefix, predefined ranges need qdr:
      requestBody.tbs = freshness.startsWith("cdr:")
        ? freshness
        : `qdr:${freshness}`;
    }

    if (filters?.country) {
      requestBody.gl = filters.country.toLowerCase();
    }

    if (filters?.language) {
      requestBody.hl = filters.language.toLowerCase();
    }

    if (filters?.safesearch) {
      requestBody.safesearch = filters.safesearch;
    }

    if (filters?.offset) {
      const count = filters.count || 20;
      // Warn if offset is not aligned with page boundaries
      if (filters.offset % count !== 0) {
        console.warn(
          `Serper: Offset ${filters.offset} is not aligned with count ${count}. ` +
          `Results may not match expected pagination.`
        );
      }
      requestBody.page = Math.floor(filters.offset / count) + 1;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(SERPER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": this.apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Serper API error (${response.status}): ${errorText}`
        );
      }

      const data: SerperResponse = await response.json();

      // Serper returns results in 'organic' for web search or 'news' for news search
      const results = data.organic || data.news || [];
      const totalResults = parseInt(
        data.searchInformation?.totalResults || "0",
        10
      );

      return {
        query: modifiedQuery,
        results: results.map((r) => this.convertResult(r)),
        totalResults: isNaN(totalResults) ? results.length : totalResults,
        metadata: {
          provider: "serper",
          searchParameters: data.searchParameters,
        },
      };
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        throw new Error(`Serper search timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Execute a single web search
   */
  async search(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    // Check cache first
    if (this.cache && this.cache.isEnabled()) {
      const cachedResult = await this.cache.get(query, filters, "serper");
      if (cachedResult) {
        return cachedResult;
      }
    }

    // Execute search
    const result = await this.searchWithRetry(query, filters);

    // Store in cache
    if (this.cache && this.cache.isEnabled()) {
      await this.cache.set(query, result, filters, "serper");
    }

    return result;
  }

  /**
   * Execute multiple searches (with built-in rate limiting)
   */
  async searchMultiple(
    queries: string[],
    filters?: SearchFilters
  ): Promise<Map<string, SearchResponse>> {
    const results = new Map<string, SearchResponse>();

    for (const query of queries) {
      try {
        const response = await this.search(query, filters);
        results.set(query, response);
      } catch (error) {
        console.error(`Failed to search query "${query}":`, error);
        // Continue with other queries even if one fails
      }
    }

    return results;
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return "Serper.dev";
  }
}

/**
 * Factory function to create Serper Search provider
 */
export function createSerperSearchProvider(
  apiKey: string,
  config?: Partial<SerperConfig>
): SerperSearchProvider {
  return new SerperSearchProvider({
    apiKey,
    ...config,
  });
}
