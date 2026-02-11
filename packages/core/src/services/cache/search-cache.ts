/**
 * Search Result Caching
 *
 * Implements intelligent caching for search results with:
 * - Freshness-aware TTL
 * - Query normalization
 * - Cache hit tracking
 * - Popular query detection
 */

import type {
  SearchFilters,
  SearchResponse,
} from "../../interfaces/search-provider";
import { RedisCache, getRedisCache, type CacheOptions } from "./redis-cache";

export interface SearchCacheConfig {
  enabled: boolean;
  baseTtl: number; // Base TTL in seconds (default: 900 = 15 minutes)
  popularTtl: number; // TTL for popular queries (default: 3600 = 1 hour)
  ttlJitter: number; // Random jitter factor (default: 0.1 = 10%)
  popularThreshold: number; // Hits required to be considered popular (default: 3)
  redisConfig?: any;
}

interface CacheMetadata {
  hits: number;
  firstCached: number;
  lastAccessed: number;
  provider: string;
}

/**
 * Search cache manager
 */
export class SearchCache {
  private cache: RedisCache;
  private config: SearchCacheConfig;
  private readonly CACHE_KEY_PREFIX = "search:";
  private readonly METADATA_KEY_PREFIX = "search:meta:";

  constructor(config: Partial<SearchCacheConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      baseTtl: config.baseTtl ?? 900, // 15 minutes
      popularTtl: config.popularTtl ?? 3600, // 1 hour
      ttlJitter: config.ttlJitter ?? 0.1, // 10%
      popularThreshold: config.popularThreshold ?? 3,
      redisConfig: config.redisConfig,
    };

    this.cache = getRedisCache({
      keyPrefix: "relevx:",
      ...this.config.redisConfig,
    });
  }

  /**
   * Normalize query for consistent cache keys
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, " ");
  }

  /**
   * Generate cache key for a search query
   */
  private generateCacheKey(
    query: string,
    filters?: SearchFilters,
    provider?: string
  ): string {
    const normalizedQuery = this.normalizeQuery(query);

    // Create a stable key from query + filters + provider
    const keyComponents = [
      normalizedQuery,
      filters?.freshness || "",
      filters?.country || "",
      filters?.language || "",
      filters?.count?.toString() || "20",
      filters?.offset?.toString() || "0",
      filters?.includeDomains?.sort().join(",") || "",
      filters?.excludeDomains?.sort().join(",") || "",
      provider || "",
    ];

    const keyString = keyComponents.join("|");
    const hash = RedisCache.hashKey(keyString);

    return `${this.CACHE_KEY_PREFIX}${hash}`;
  }

  /**
   * Generate metadata key
   */
  private getMetadataKey(cacheKey: string): string {
    return `${this.METADATA_KEY_PREFIX}${cacheKey.replace(
      this.CACHE_KEY_PREFIX,
      ""
    )}`;
  }

  /**
   * Get cache metadata for a key
   */
  private async getMetadata(cacheKey: string): Promise<CacheMetadata | null> {
    const metaKey = this.getMetadataKey(cacheKey);
    return await this.cache.get<CacheMetadata>(metaKey);
  }

  /**
   * Update cache metadata (track hits and popularity)
   */
  private async updateMetadata(
    cacheKey: string,
    provider: string,
    isNewEntry: boolean = false
  ): Promise<CacheMetadata> {
    const metaKey = this.getMetadataKey(cacheKey);
    const now = Date.now();

    let metadata = await this.getMetadata(cacheKey);

    if (!metadata || isNewEntry) {
      metadata = {
        hits: 1,
        firstCached: now,
        lastAccessed: now,
        provider,
      };
    } else {
      metadata.hits += 1;
      metadata.lastAccessed = now;
    }

    // Store metadata with same TTL as the cached result
    const ttl = await this.cache.ttl(cacheKey);
    if (ttl > 0) {
      await this.cache.set(metaKey, metadata, { ttl });
    }

    return metadata;
  }

  /**
   * Determine TTL based on query popularity
   */
  private async determineTtl(cacheKey: string): Promise<CacheOptions> {
    const metadata = await this.getMetadata(cacheKey);

    // Use longer TTL for popular queries
    const isPopular =
      metadata && metadata.hits >= this.config.popularThreshold;
    const ttl = isPopular ? this.config.popularTtl : this.config.baseTtl;

    return {
      ttl,
      jitter: this.config.ttlJitter,
    };
  }

  /**
   * Get cached search results
   */
  async get(
    query: string,
    filters?: SearchFilters,
    provider?: string
  ): Promise<SearchResponse | null> {
    if (!this.config.enabled || !this.cache.isReady()) {
      return null;
    }

    try {
      const cacheKey = this.generateCacheKey(query, filters, provider);
      const cachedResult = await this.cache.get<SearchResponse>(cacheKey);

      if (cachedResult) {
        // Update metadata to track hit
        await this.updateMetadata(cacheKey, provider || "unknown");

        console.log(`Cache HIT for query: "${query}"`);
        return cachedResult;
      }

      console.log(`Cache MISS for query: "${query}"`);
      return null;
    } catch (error) {
      console.error("Error getting from search cache:", error);
      return null;
    }
  }

  /**
   * Store search results in cache
   */
  async set(
    query: string,
    result: SearchResponse,
    filters?: SearchFilters,
    provider?: string
  ): Promise<void> {
    if (!this.config.enabled || !this.cache.isReady()) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(query, filters, provider);

      // Determine TTL based on query popularity
      const cacheOptions = await this.determineTtl(cacheKey);

      // Store the result
      await this.cache.set(cacheKey, result, cacheOptions);

      // Initialize metadata for new entry
      await this.updateMetadata(cacheKey, provider || "unknown", true);

      console.log(
        `Cached search result for query: "${query}" (TTL: ${cacheOptions.ttl}s)`
      );
    } catch (error) {
      console.error("Error setting search cache:", error);
    }
  }

  /**
   * Invalidate cache for a specific query
   */
  async invalidate(
    query: string,
    filters?: SearchFilters,
    provider?: string
  ): Promise<void> {
    if (!this.cache.isReady()) {
      return;
    }

    try {
      const cacheKey = this.generateCacheKey(query, filters, provider);
      await this.cache.delete(cacheKey);

      const metaKey = this.getMetadataKey(cacheKey);
      await this.cache.delete(metaKey);

      console.log(`Invalidated cache for query: "${query}"`);
    } catch (error) {
      console.error("Error invalidating search cache:", error);
    }
  }

  /**
   * Invalidate all search caches (useful for testing or emergencies)
   */
  async invalidateAll(): Promise<number> {
    if (!this.cache.isReady()) {
      return 0;
    }

    try {
      const searchKeysDeleted = await this.cache.deletePattern(
        `${this.CACHE_KEY_PREFIX}*`
      );
      const metaKeysDeleted = await this.cache.deletePattern(
        `${this.METADATA_KEY_PREFIX}*`
      );

      const totalDeleted = searchKeysDeleted + metaKeysDeleted;
      console.log(`Invalidated ${totalDeleted} search cache entries`);
      return totalDeleted;
    } catch (error) {
      console.error("Error invalidating all search caches:", error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    cacheEnabled: boolean;
    redisConnected: boolean;
    totalKeys: number;
    memory: string;
    hits: number;
    misses: number;
    hitRate: string;
  }> {
    const baseStats = {
      cacheEnabled: this.config.enabled,
      redisConnected: this.cache.isReady(),
      totalKeys: 0,
      memory: "0",
      hits: 0,
      misses: 0,
      hitRate: "0%",
    };

    if (!this.cache.isReady()) {
      return baseStats;
    }

    try {
      const redisStats = await this.cache.getStats();
      const total = redisStats.hits + redisStats.misses;
      const hitRate =
        total > 0
          ? ((redisStats.hits / total) * 100).toFixed(2) + "%"
          : "0%";

      return {
        ...baseStats,
        totalKeys: redisStats.keys,
        memory: redisStats.memory,
        hits: redisStats.hits,
        misses: redisStats.misses,
        hitRate,
      };
    } catch (error) {
      console.error("Error getting search cache stats:", error);
      return baseStats;
    }
  }

  /**
   * Check if cache is enabled and ready
   */
  isEnabled(): boolean {
    return this.config.enabled && this.cache.isReady();
  }

  /**
   * Close the cache connection
   */
  async close(): Promise<void> {
    await this.cache.close();
  }
}

// Singleton instance
let searchCacheInstance: SearchCache | null = null;

/**
 * Get or create the search cache instance
 */
export function getSearchCache(
  config?: Partial<SearchCacheConfig>
): SearchCache {
  if (!searchCacheInstance) {
    searchCacheInstance = new SearchCache(config);
  }
  return searchCacheInstance;
}

/**
 * Close the search cache instance
 */
export async function closeSearchCache(): Promise<void> {
  if (searchCacheInstance) {
    await searchCacheInstance.close();
    searchCacheInstance = null;
  }
}
