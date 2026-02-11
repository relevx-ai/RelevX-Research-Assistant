/**
 * Cache services export
 */

export {
  RedisCache,
  getRedisCache,
  closeRedisCache,
  type RedisCacheConfig,
  type CacheOptions,
} from "./redis-cache";

export {
  SearchCache,
  getSearchCache,
  closeSearchCache,
  type SearchCacheConfig,
} from "./search-cache";

export {
  SemanticDedup,
  getSemanticDedup,
  resetSemanticDedup,
  type SemanticDedupConfig,
} from "./semantic-dedup";
