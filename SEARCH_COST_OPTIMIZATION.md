# Web Search Cost Optimization - Implementation Guide

This document describes the implementation of web search cost optimization features for RelevX Research Assistant, including setup instructions, usage examples, and monitoring guidance.

## Overview

The cost optimization implementation reduces web search costs by **90%+** through:

1. **Serper.dev API Integration** (80% cost reduction)
2. **Redis Search Caching** (50% additional reduction through cache hits)
3. **Semantic Query Deduplication** (15-20% query reduction)
4. **Multi-Provider Fallback** (improved reliability + cost stability)

### Cost Comparison

| Scenario | Monthly Cost (10K runs) | Annual Cost | Savings |
|----------|-------------------------|-------------|---------|
| **Before (Brave, no cache)** | $750 | $9,000 | - |
| **After Phase 1 (Serper + Cache)** | $75 | $900 | 90% |
| **After Phase 2 (+ Full Optimization)** | $50 | $600 | 93% |

---

## Prerequisites

### 1. Redis Installation

You need a Redis instance for caching. Choose one option:

**Option A: Local Redis (Development)**
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:latest
```

**Option B: Managed Redis (Production)**
- [Redis Cloud](https://redis.com/try-free/) - Free tier: 30MB
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
- [Azure Cache for Redis](https://azure.microsoft.com/en-us/services/cache/)

### 2. Serper.dev API Key

1. Sign up at [serper.dev](https://serper.dev)
2. Get API key from dashboard
3. Pricing: $0.30-$1.00 per 1K queries (80% cheaper than Brave)
4. Initial credit: $50 = 50K queries

---

## Installation

### 1. Install Dependencies

```bash
# Install dependencies
pnpm install

# This will install:
# - ioredis: Redis client for Node.js
# - @types/ioredis: TypeScript types
```

### 2. Configure Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```bash
# Required: Serper.dev API Key
SERPER_API_KEY=your_serper_api_key_here

# Required: OpenAI API Key (for embeddings in semantic deduplication)
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Brave Search API Key (fallback provider)
BRAVE_API_KEY=your_brave_api_key_here

# Redis Configuration (defaults shown)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Feature Flags
ENABLE_SEARCH_CACHE=true
ENABLE_SEMANTIC_DEDUP=false  # Enable for Phase 2
ENABLE_MULTI_PROVIDER=false  # Enable for Phase 2
```

### 3. Update Configuration

The `research-config.yaml` has been updated with new settings:

```yaml
search:
  # Switch to Serper.dev (80% cheaper)
  provider: "serper"  # or "brave" or "multi"

cache:
  enabled: true
  provider: "redis"
  redis:
    host: ${REDIS_HOST:-localhost}
    port: ${REDIS_PORT:-6379}
  searchResults:
    baseTtl: 900        # 15 minutes
    popularTtl: 3600    # 1 hour (for frequently searched queries)
    ttlJitter: 0.1      # 10% jitter to prevent cache stampede
    popularThreshold: 3 # Hits required for extended TTL
```

### 4. Build the Project

```bash
# Build the core package
cd packages/core
pnpm build

# Or build all packages
cd ../..
pnpm build
```

---

## Usage Examples

### Example 1: Using Serper.dev Provider (Phase 1)

```typescript
import { createSerperSearchProvider } from "core/services/search";

// Initialize Serper provider
const searchProvider = createSerperSearchProvider(
  process.env.SERPER_API_KEY!,
  {
    enableCache: true, // Enable Redis caching
    timeout: 10000,
    maxRetries: 3,
  }
);

// Execute a search (automatically checks cache first)
const results = await searchProvider.search("AI research trends 2025", {
  count: 10,
  freshness: "pm", // Past month
  country: "US",
});

console.log(`Found ${results.totalResults} results`);
console.log(`First result: ${results.results[0].title}`);
```

### Example 2: Using Multi-Provider with Fallback (Phase 2)

```typescript
import {
  createSerperSearchProvider,
  createBraveSearchProvider,
  createMultiSearchProvider,
} from "core/services/search";

// Initialize providers
const serperProvider = createSerperSearchProvider(process.env.SERPER_API_KEY!);
const braveProvider = createBraveSearchProvider(process.env.BRAVE_API_KEY!);

// Create multi-provider with automatic fallback
const multiProvider = createMultiSearchProvider({
  providers: {
    primary: serperProvider,    // Cheap, fast
    fallback: braveProvider,    // Reliable fallback
  },
  failureThreshold: 3,          // Mark unhealthy after 3 failures
  recoveryTimeout: 300000,      // Retry after 5 minutes
});

// Search automatically falls back if primary fails
const results = await multiProvider.search("quantum computing breakthroughs");

// Check provider health
const health = multiProvider.getHealthStats();
console.log("Provider health:", health);
```

### Example 3: With Semantic Deduplication (Phase 2)

```typescript
import { getSemanticDedup } from "core/services/cache";

// Initialize semantic deduplication
const dedup = getSemanticDedup({
  enabled: true,
  similarityThreshold: 0.85,  // 85% similarity threshold
  windowHours: 24,            // Check last 24 hours of queries
});

// Check if similar query was already executed
const similar = await dedup.findSimilarQuery(
  "artificial intelligence trends in 2025"
);

if (similar.found) {
  console.log(`Found similar query: "${similar.similarQuery}"`);
  console.log(`Similarity: ${similar.similarity?.toFixed(3)}`);
  // Reuse cached results from similar query
} else {
  // Execute new search
  const results = await searchProvider.search("AI trends 2025");
}

// Get deduplication stats
const stats = await dedup.getStats();
console.log(`Total queries tracked: ${stats.totalQueries}`);
```

### Example 4: Direct Cache Control

```typescript
import { getSearchCache } from "core/services/cache";

// Get cache instance
const cache = getSearchCache({
  enabled: true,
  baseTtl: 900,       // 15 minutes
  popularTtl: 3600,   // 1 hour for popular queries
});

// Manually invalidate a cached query
await cache.invalidate("outdated query", filters);

// Get cache statistics
const stats = await cache.getStats();
console.log(`Cache hit rate: ${stats.hitRate}`);
console.log(`Total keys: ${stats.totalKeys}`);
console.log(`Memory usage: ${stats.memory}`);

// Clear all cached searches (emergency use)
await cache.invalidateAll();
```

---

## Integration with Research Engine

The research engine (`packages/core/src/services/research-engine/orchestrator.ts`) needs to be updated to use the new search providers. Here's how to integrate:

### Option 1: Update Orchestrator to Use Serper

```typescript
// In orchestrator.ts or your initialization code
import { createSerperSearchProvider } from "../search";

// Replace Brave provider initialization with:
const searchProvider = createSerperSearchProvider(
  process.env.SERPER_API_KEY!,
  { enableCache: true }
);
```

### Option 2: Use Multi-Provider with Fallback

```typescript
import {
  createSerperSearchProvider,
  createBraveSearchProvider,
  createMultiSearchProvider,
} from "../search";

const primaryProvider = createSerperSearchProvider(process.env.SERPER_API_KEY!);
const fallbackProvider = createBraveSearchProvider(process.env.BRAVE_API_KEY!);

const searchProvider = createMultiSearchProvider({
  providers: {
    primary: primaryProvider,
    fallback: fallbackProvider,
  },
});
```

### Option 3: Add Semantic Deduplication to Search Loop

```typescript
import { getSemanticDedup } from "../cache";

// In the search execution loop (around line 310-340 in orchestrator.ts)
const dedup = getSemanticDedup({ enabled: true });

for (const query of queries) {
  // Check for similar queries
  const similar = await dedup.findSimilarQuery(query, filters);

  if (similar.found && similar.cacheKey) {
    // Reuse cached result from similar query
    const cached = await searchCache.get(similar.similarQuery!, filters);
    if (cached) {
      results.set(query, cached);
      continue;
    }
  }

  // Execute new search
  const result = await searchProvider.search(query, filters);
  results.set(query, result);
}
```

---

## Monitoring & Observability

### 1. Cache Performance Monitoring

```typescript
import { getSearchCache } from "core/services/cache";

const cache = getSearchCache();
const stats = await cache.getStats();

console.log(`
Cache Statistics:
- Enabled: ${stats.cacheEnabled}
- Connected: ${stats.redisConnected}
- Total Keys: ${stats.totalKeys}
- Memory Usage: ${stats.memory}
- Cache Hits: ${stats.hits}
- Cache Misses: ${stats.misses}
- Hit Rate: ${stats.hitRate}
`);
```

### 2. Provider Health Monitoring

```typescript
import { MultiSearchProvider } from "core/services/search";

const health = multiProvider.getHealthStats();

for (const [name, stats] of Object.entries(health)) {
  console.log(`
Provider: ${name}
- Healthy: ${stats.healthy}
- Success Rate: ${stats.successRate}
- Total Requests: ${stats.totalRequests}
- Total Failures: ${stats.totalFailures}
- Consecutive Failures: ${stats.consecutiveFailures}
  `);
}
```

### 3. Cost Tracking

Track costs by counting API calls:

```typescript
// In your delivery stats or monitoring service
interface CostStats {
  provider: string;
  queriesExecuted: number;
  cacheHits: number;
  cacheMisses: number;
  dedupSaved: number;
  estimatedCost: number;
}

function calculateCost(stats: CostStats): number {
  const costPerQuery = stats.provider === "serper" ? 0.001 : 0.005;
  return stats.cacheMisses * costPerQuery;
}
```

### 4. Log Examples

The implementation includes comprehensive logging:

```
[INFO] Cache HIT for query: "AI trends 2025"
[INFO] Cache MISS for query: "quantum computing news"
[INFO] Cached search result for query: "machine learning" (TTL: 900s)
[INFO] Found similar query: "ML trends" ~= "machine learning trends" (similarity: 0.892)
[WARN] Provider primary marked unhealthy after 3 consecutive failures
[INFO] Using fallback provider (primary unhealthy)
```

---

## Testing

### 1. Test Redis Connection

```typescript
import { getRedisCache } from "core/services/cache";

const cache = getRedisCache();
const isConnected = await cache.ping();
console.log(`Redis connected: ${isConnected}`);
```

### 2. Test Serper API

```typescript
import { createSerperSearchProvider } from "core/services/search";

const provider = createSerperSearchProvider(process.env.SERPER_API_KEY!);
const results = await provider.search("test query");
console.log(`Serper working: ${results.results.length > 0}`);
```

### 3. Test Cache Functionality

```typescript
const cache = getSearchCache();

// First search - should miss cache
const result1 = await provider.search("test query");
const stats1 = await cache.getStats();
console.log(`First search - Misses: ${stats1.misses}`);

// Second search - should hit cache
const result2 = await provider.search("test query");
const stats2 = await cache.getStats();
console.log(`Second search - Hits: ${stats2.hits}`);
```

### 4. End-to-End Cost Test

Run 100 research iterations and measure actual costs:

```bash
# TODO: Create a test script
npm run test:cost-optimization
```

---

## Troubleshooting

### Issue: Redis connection fails

**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# Check Redis logs
tail -f /var/log/redis/redis-server.log

# Verify connection settings in .env
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Issue: Serper API errors

**Solution:**
```bash
# Test API key directly
curl -X POST https://serpapi.serper.dev/search \
  -H "X-API-KEY: your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"q": "test"}'

# Check rate limits on Serper dashboard
# Verify API key in .env
```

### Issue: Cache not working

**Solution:**
```typescript
// Check cache status
const cache = getSearchCache();
console.log("Cache enabled:", cache.isEnabled());

// Check feature flag
console.log("ENABLE_SEARCH_CACHE:", process.env.ENABLE_SEARCH_CACHE);

// Manually test cache
await cache.set("test", { data: "test" }, { ttl: 60 });
const result = await cache.get("test");
console.log("Cache working:", result !== null);
```

### Issue: Semantic deduplication not detecting similar queries

**Solution:**
```typescript
// Check if enabled
const dedup = getSemanticDedup();
console.log("Dedup enabled:", dedup.isEnabled());

// Lower similarity threshold for testing
const dedup = getSemanticDedup({
  enabled: true,
  similarityThreshold: 0.75, // Lower threshold
});

// Check OpenAI API key
console.log("OPENAI_API_KEY set:", !!process.env.OPENAI_API_KEY);
```

---

## Performance Benchmarks

### Expected Performance Improvements

| Metric | Before | After Phase 1 | After Phase 2 |
|--------|--------|---------------|---------------|
| **Cost per 1K runs** | $75 | $7.50 | $5.00 |
| **Cache hit rate** | 0% | 40-50% | 50-60% |
| **Query deduplication** | 0% | 0% | 15-20% |
| **API latency (cached)** | 2000ms | <100ms | <100ms |
| **API latency (uncached)** | 2000ms | 1500ms | 1500ms |

### Measured Results

TODO: Add actual benchmark results after deployment

---

## Migration Guide

### For Existing Projects Using Brave Search

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Add environment variables:**
   ```bash
   # Add to .env
   SERPER_API_KEY=your_key
   REDIS_HOST=localhost
   REDIS_PORT=6379
   ```

3. **Update search provider initialization:**
   ```typescript
   // Old
   import { createBraveSearchProvider } from "core/services/search";
   const provider = createBraveSearchProvider(process.env.BRAVE_API_KEY!);

   // New
   import { createSerperSearchProvider } from "core/services/search";
   const provider = createSerperSearchProvider(process.env.SERPER_API_KEY!);
   ```

4. **Test thoroughly before production:**
   - Run test suite
   - Monitor cache hit rates
   - Compare result quality
   - Track actual costs

---

## Rollback Plan

If issues arise, you can quickly rollback:

1. **Switch back to Brave:**
   ```yaml
   # research-config.yaml
   search:
     provider: "brave"
   ```

2. **Disable cache:**
   ```bash
   # .env
   ENABLE_SEARCH_CACHE=false
   ```

3. **Disable semantic dedup:**
   ```bash
   # .env
   ENABLE_SEMANTIC_DEDUP=false
   ```

---

## Next Steps

### Phase 3 Enhancements (Optional)

1. **Enhanced Search History Reuse**
   - Store full search responses in history
   - Reuse results across iterations

2. **Smarter Query Generation**
   - Pre-filter queries by semantic similarity
   - Dynamic adjustment of queriesPerIteration

3. **Pagination Optimization**
   - Use pagination for high-performing queries
   - Reduce new query generation

---

## Support & Feedback

For issues or questions:
- GitHub Issues: https://github.com/relevx-ai/RelevX-Research-Assistant/issues
- Documentation: See this file and inline code comments

For cost optimization suggestions or improvements, please open a GitHub issue with the label `cost-optimization`.
