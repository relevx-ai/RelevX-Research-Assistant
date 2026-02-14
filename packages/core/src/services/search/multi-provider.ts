/**
 * Multi-Provider Search Orchestrator
 *
 * Manages multiple search providers with automatic fallback and health checking
 * Provider priority: Serper (primary) → Brave (fallback) → DuckDuckGo (free)
 */

import type {
  SearchProvider,
  SearchFilters,
  SearchResponse,
} from "../../interfaces/search-provider";

export interface MultiProviderConfig {
  providers: {
    primary: SearchProvider;
    fallback?: SearchProvider;
    free?: SearchProvider;
  };
  healthCheckInterval?: number; // Milliseconds between health checks (default: 60000 = 1 min)
  failureThreshold?: number; // Failures before marking unhealthy (default: 3)
  recoveryTimeout?: number; // Time before retrying failed provider (default: 300000 = 5 min)
}

interface ProviderHealth {
  healthy: boolean;
  consecutiveFailures: number;
  lastFailure?: number;
  lastSuccess?: number;
  totalRequests: number;
  totalFailures: number;
}

/**
 * Multi-provider search orchestrator with automatic fallback
 */
export class MultiSearchProvider implements SearchProvider {
  private providers: {
    primary: SearchProvider;
    fallback?: SearchProvider;
    free?: SearchProvider;
  };
  private config: Required<Omit<MultiProviderConfig, "providers">>;
  private health: Map<string, ProviderHealth>;

  constructor(config: MultiProviderConfig) {
    this.providers = config.providers;
    this.config = {
      healthCheckInterval: config.healthCheckInterval ?? 60000,
      failureThreshold: config.failureThreshold ?? 3,
      recoveryTimeout: config.recoveryTimeout ?? 300000,
    };

    // Initialize health tracking
    this.health = new Map();
    this.initializeHealth("primary", this.providers.primary);
    if (this.providers.fallback) {
      this.initializeHealth("fallback", this.providers.fallback);
    }
    if (this.providers.free) {
      this.initializeHealth("free", this.providers.free);
    }
  }

  /**
   * Initialize health tracking for a provider
   */
  private initializeHealth(name: string, provider: SearchProvider): void {
    this.health.set(name, {
      healthy: true,
      consecutiveFailures: 0,
      totalRequests: 0,
      totalFailures: 0,
    });
  }

  /**
   * Get provider health
   */
  private getProviderHealth(name: string): ProviderHealth {
    const health = this.health.get(name);
    if (!health) {
      throw new Error(`Provider ${name} not found`);
    }
    return health;
  }

  /**
   * Check if provider is healthy
   */
  private isProviderHealthy(name: string): boolean {
    const health = this.getProviderHealth(name);

    // Check if marked unhealthy
    if (!health.healthy) {
      // Check if recovery timeout has passed
      if (health.lastFailure) {
        const timeSinceFailure = Date.now() - health.lastFailure;
        if (timeSinceFailure >= this.config.recoveryTimeout) {
          console.log(
            `Provider ${name} recovery timeout passed, marking as healthy for retry`
          );
          health.healthy = true;
          health.consecutiveFailures = 0;
        }
      }
    }

    return health.healthy;
  }

  /**
   * Record successful request
   */
  private recordSuccess(name: string): void {
    const health = this.getProviderHealth(name);
    health.totalRequests++;
    health.consecutiveFailures = 0;
    health.lastSuccess = Date.now();
    health.healthy = true;
  }

  /**
   * Record failed request
   */
  private recordFailure(name: string, error: Error): void {
    const health = this.getProviderHealth(name);
    health.totalRequests++;
    health.totalFailures++;
    health.consecutiveFailures++;
    health.lastFailure = Date.now();

    // Mark unhealthy if threshold exceeded
    if (health.consecutiveFailures >= this.config.failureThreshold) {
      console.warn(
        `Provider ${name} marked unhealthy after ${health.consecutiveFailures} consecutive failures`
      );
      health.healthy = false;
    }

    console.error(`Provider ${name} request failed:`, error.message);
  }

  /**
   * Select the best available provider, excluding already-attempted ones
   */
  private selectProvider(
    excludeProviders: Set<string> = new Set()
  ): {
    name: string;
    provider: SearchProvider;
  } | null {
    // Try primary first (if not already attempted and healthy)
    if (
      !excludeProviders.has("primary") &&
      this.isProviderHealthy("primary")
    ) {
      return { name: "primary", provider: this.providers.primary };
    }

    // Try fallback if available (if not already attempted and healthy)
    if (
      this.providers.fallback &&
      !excludeProviders.has("fallback") &&
      this.isProviderHealthy("fallback")
    ) {
      console.log("Using fallback provider (primary unavailable)");
      return { name: "fallback", provider: this.providers.fallback };
    }

    // Try free provider if available (if not already attempted and healthy)
    if (
      this.providers.free &&
      !excludeProviders.has("free") &&
      this.isProviderHealthy("free")
    ) {
      console.log("Using free provider (primary and fallback unavailable)");
      return { name: "free", provider: this.providers.free };
    }

    // No healthy providers available
    return null;
  }

  /**
   * Execute a single web search with automatic fallback
   */
  async search(
    query: string,
    filters?: SearchFilters
  ): Promise<SearchResponse> {
    const attemptedProviders = new Set<string>();
    const maxProviders = this.health.size;

    // Try each available provider once
    for (let attempt = 1; attempt <= maxProviders; attempt++) {
      const selected = this.selectProvider(attemptedProviders);

      if (!selected) {
        throw new Error(
          "All search providers are unhealthy or have been attempted. Please try again later."
        );
      }

      attemptedProviders.add(selected.name);

      try {
        console.log(`Searching with ${selected.name} provider: "${query}"`);
        const result = await selected.provider.search(query, filters);
        this.recordSuccess(selected.name);
        return result;
      } catch (error) {
        this.recordFailure(selected.name, error as Error);

        // If we've tried all providers, throw the error
        if (attemptedProviders.size === this.health.size) {
          throw new Error(
            `Failed to execute search after trying all ${this.health.size} provider(s): ${error}`
          );
        }

        // Otherwise, continue to next provider
        console.log(
          `Provider ${selected.name} failed, trying next provider...`
        );
      }
    }

    throw new Error("Failed to execute search after trying all providers");
  }

  /**
   * Execute multiple searches with automatic fallback
   */
  async searchMultiple(
    queries: string[],
    filters?: SearchFilters
  ): Promise<Map<string, SearchResponse>> {
    const results = new Map<string, SearchResponse>();

    // Process queries sequentially to respect rate limits
    for (const query of queries) {
      try {
        const result = await this.search(query, filters);
        results.set(query, result);
      } catch (error) {
        console.error(`Failed to search query "${query}":`, error);
        // Continue with other queries
      }
    }

    return results;
  }

  /**
   * Get the provider name
   */
  getName(): string {
    return "Multi-Provider (Serper → Brave → DuckDuckGo)";
  }

  /**
   * Get health statistics for all providers
   */
  getHealthStats(): {
    [key: string]: {
      healthy: boolean;
      successRate: string;
      consecutiveFailures: number;
      totalRequests: number;
      totalFailures: number;
      lastSuccess?: number;
      lastFailure?: number;
    };
  } {
    const stats: any = {};

    for (const [name, health] of this.health.entries()) {
      const successRate =
        health.totalRequests > 0
          ? (
              ((health.totalRequests - health.totalFailures) /
                health.totalRequests) *
              100
            ).toFixed(2) + "%"
          : "N/A";

      stats[name] = {
        healthy: health.healthy,
        successRate,
        consecutiveFailures: health.consecutiveFailures,
        totalRequests: health.totalRequests,
        totalFailures: health.totalFailures,
        lastSuccess: health.lastSuccess,
        lastFailure: health.lastFailure,
      };
    }

    return stats;
  }

  /**
   * Manually reset health for a provider
   */
  resetProviderHealth(providerName: string): void {
    const health = this.health.get(providerName);
    if (health) {
      health.healthy = true;
      health.consecutiveFailures = 0;
      console.log(`Reset health for provider: ${providerName}`);
    }
  }

  /**
   * Reset health for all providers
   */
  resetAllHealth(): void {
    for (const name of this.health.keys()) {
      this.resetProviderHealth(name);
    }
  }
}

/**
 * Factory function to create multi-provider search provider
 */
export function createMultiSearchProvider(
  config: MultiProviderConfig
): MultiSearchProvider {
  return new MultiSearchProvider(config);
}
