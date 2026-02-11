/**
 * Redis Cache Infrastructure
 *
 * Provides a simple Redis client wrapper for caching operations
 * Supports TTL, key expiration, and automatic connection management
 */

import Redis from "ioredis";
import { createHash } from "crypto";

export interface RedisCacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | null;
}

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  jitter?: number; // Random jitter factor (0-1) to prevent cache stampede
}

/**
 * Redis cache client wrapper
 */
export class RedisCache {
  private client: Redis;
  private isConnected: boolean = false;

  constructor(config: RedisCacheConfig = {}) {
    const defaultConfig: RedisCacheConfig = {
      host: config.host || process.env.REDIS_HOST || "localhost",
      port: config.port || parseInt(process.env.REDIS_PORT || "6379", 10),
      password: config.password || process.env.REDIS_PASSWORD,
      db: config.db || 0,
      keyPrefix: config.keyPrefix || "relevx:",
      enableOfflineQueue: config.enableOfflineQueue ?? false,
      maxRetriesPerRequest: config.maxRetriesPerRequest ?? 3,
      retryStrategy:
        config.retryStrategy ||
        ((times: number) => {
          if (times > 3) return null; // Stop retrying after 3 attempts
          return Math.min(times * 200, 2000); // Exponential backoff up to 2 seconds
        }),
    };

    this.client = new Redis(defaultConfig);

    this.client.on("connect", () => {
      this.isConnected = true;
      console.log("Redis cache connected");
    });

    this.client.on("error", (error) => {
      console.error("Redis cache error:", error);
      this.isConnected = false;
    });

    this.client.on("close", () => {
      this.isConnected = false;
      console.log("Redis cache connection closed");
    });
  }

  /**
   * Check if Redis is connected
   */
  isReady(): boolean {
    return this.isConnected && this.client.status === "ready";
  }

  /**
   * Generate a hash for a cache key
   */
  static hashKey(input: string): string {
    return createHash("sha256").update(input).digest("hex").substring(0, 16);
  }

  /**
   * Apply jitter to TTL to prevent cache stampede
   */
  private applyJitter(ttl: number, jitter: number): number {
    if (jitter <= 0 || jitter > 1) return ttl;
    const jitterAmount = ttl * jitter;
    const randomJitter = Math.random() * jitterAmount;
    return Math.floor(ttl + randomJitter);
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isReady()) {
      console.warn("Redis not ready, cache miss");
      return null;
    }

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isReady()) {
      console.warn("Redis not ready, skipping cache set");
      return;
    }

    try {
      const serialized = JSON.stringify(value);

      if (options?.ttl) {
        const ttl = options.jitter
          ? this.applyJitter(options.ttl, options.jitter)
          : options.ttl;
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
    }
  }

  /**
   * Delete a key from cache
   */
  async delete(key: string): Promise<void> {
    if (!this.isReady()) {
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
    }
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const stream = this.client.scanStream({
        match: pattern,
        count: 100,
      });

      let deletedCount = 0;
      const pipeline = this.client.pipeline();

      for await (const keys of stream) {
        if (keys.length > 0) {
          keys.forEach((key: string) => pipeline.del(key));
          deletedCount += keys.length;
        }
      }

      await pipeline.exec();
      return deletedCount;
    } catch (error) {
      console.error(`Error deleting cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) {
      return false;
    }

    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Error checking cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isReady()) {
      return -2;
    }

    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error(`Error getting TTL for cache key ${key}:`, error);
      return -2;
    }
  }

  /**
   * Increment a counter
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      console.error(`Error incrementing cache key ${key}:`, error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    keys: number;
    memory: string;
    hits: number;
    misses: number;
  }> {
    if (!this.isReady()) {
      return { keys: 0, memory: "0", hits: 0, misses: 0 };
    }

    try {
      // Get stats section for hits/misses
      const statsInfo = await this.client.info("stats");
      // Get memory section for memory usage
      const memoryInfo = await this.client.info("memory");
      const dbsize = await this.client.dbsize();

      // Parse stats from INFO command
      const hitsMatch = statsInfo.match(/keyspace_hits:(\d+)/);
      const missesMatch = statsInfo.match(/keyspace_misses:(\d+)/);
      const memoryMatch = memoryInfo.match(/used_memory_human:([^\r\n]+)/);

      return {
        keys: dbsize,
        memory: memoryMatch ? memoryMatch[1] : "unknown",
        hits: hitsMatch ? parseInt(hitsMatch[1], 10) : 0,
        misses: missesMatch ? parseInt(missesMatch[1], 10) : 0,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { keys: 0, memory: "0", hits: 0, misses: 0 };
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  /**
   * Ping Redis to check connection
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === "PONG";
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: RedisCache | null = null;

/**
 * Get or create the Redis cache instance
 */
export function getRedisCache(config?: RedisCacheConfig): RedisCache {
  if (!cacheInstance) {
    cacheInstance = new RedisCache(config);
  }
  return cacheInstance;
}

/**
 * Close the Redis cache instance
 */
export async function closeRedisCache(): Promise<void> {
  if (cacheInstance) {
    await cacheInstance.close();
    cacheInstance = null;
  }
}
