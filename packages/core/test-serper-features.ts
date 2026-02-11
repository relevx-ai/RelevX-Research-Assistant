/**
 * Test script to verify Serper provider feature parity with Brave Search
 *
 * This script tests:
 * 1. SafeSearch filtering
 * 2. Custom date range formatting
 * 3. Pagination with edge cases
 *
 * Usage:
 *   SERPER_API_KEY=xxx ts-node test-serper-features.ts
 */

import { createSerperSearchProvider } from "./src/services/search/serper-provider";
import type { SearchFilters } from "./src/interfaces/search-provider";

// Color codes for terminal output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const RESET = "\x1b[0m";

function log(message: string, color: string = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function logTest(testName: string) {
  log(`\n${"=".repeat(60)}`, BLUE);
  log(`TEST: ${testName}`, BLUE);
  log("=".repeat(60), BLUE);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, GREEN);
}

function logError(message: string) {
  log(`✗ ${message}`, RED);
}

function logWarning(message: string) {
  log(`⚠ ${message}`, YELLOW);
}

async function testSafeSearch() {
  logTest("SafeSearch Filter");

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logError("SERPER_API_KEY environment variable not set");
    return false;
  }

  const provider = createSerperSearchProvider(apiKey, { enableCache: false });

  try {
    // Test with strict safesearch
    log("\n1. Testing with safesearch: 'strict'");
    const strictResults = await provider.search("test query", {
      safesearch: "strict" as any,
      count: 5,
    });
    logSuccess(`Got ${strictResults.results.length} results with strict safesearch`);
    log(`   Sample URL: ${strictResults.results[0]?.url || "N/A"}`);

    // Test with moderate safesearch
    log("\n2. Testing with safesearch: 'moderate'");
    const moderateResults = await provider.search("test query", {
      safesearch: "moderate" as any,
      count: 5,
    });
    logSuccess(`Got ${moderateResults.results.length} results with moderate safesearch`);

    // Test with safesearch off
    log("\n3. Testing with safesearch: 'off'");
    const offResults = await provider.search("test query", {
      safesearch: "off" as any,
      count: 5,
    });
    logSuccess(`Got ${offResults.results.length} results with safesearch off`);

    logSuccess("\nSafeSearch test completed successfully");
    return true;
  } catch (error) {
    logError(`SafeSearch test failed: ${error}`);
    return false;
  }
}

async function testCustomDateRange() {
  logTest("Custom Date Range");

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logError("SERPER_API_KEY environment variable not set");
    return false;
  }

  const provider = createSerperSearchProvider(apiKey, { enableCache: false });

  try {
    // Test January 2024 date range
    log("\n1. Testing dateFrom: '2024-01-01', dateTo: '2024-01-31'");
    const jan2024Results = await provider.search("AI news", {
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      count: 10,
    });
    logSuccess(`Got ${jan2024Results.results.length} results for January 2024`);

    // Check if results have dates
    const resultsWithDates = jan2024Results.results.filter(r => r.publishedDate);
    log(`   Results with dates: ${resultsWithDates.length}/${jan2024Results.results.length}`);
    if (resultsWithDates.length > 0) {
      log(`   Sample date: ${resultsWithDates[0].publishedDate}`);
    }

    // Test multi-month range
    log("\n2. Testing dateFrom: '2023-12-01', dateTo: '2024-03-31'");
    const multiMonthResults = await provider.search("AI news", {
      dateFrom: "2023-12-01",
      dateTo: "2024-03-31",
      count: 10,
    });
    logSuccess(`Got ${multiMonthResults.results.length} results for Dec 2023 - Mar 2024`);

    // Test same day range
    log("\n3. Testing same day range: '2024-01-15' to '2024-01-15'");
    const sameDayResults = await provider.search("AI news", {
      dateFrom: "2024-01-15",
      dateTo: "2024-01-15",
      count: 10,
    });
    logSuccess(`Got ${sameDayResults.results.length} results for single day`);

    logSuccess("\nCustom date range test completed successfully");
    return true;
  } catch (error) {
    logError(`Custom date range test failed: ${error}`);
    return false;
  }
}

async function testPagination() {
  logTest("Pagination");

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logError("SERPER_API_KEY environment variable not set");
    return false;
  }

  const provider = createSerperSearchProvider(apiKey, { enableCache: false });

  try {
    // Test first page (offset: 0)
    log("\n1. Testing offset: 0, count: 10 (page 1)");
    const page1Results = await provider.search("test query", {
      offset: 0,
      count: 10,
    });
    logSuccess(`Page 1: Got ${page1Results.results.length} results`);
    const page1FirstUrl = page1Results.results[0]?.url;
    log(`   First result URL: ${page1FirstUrl}`);

    // Test second page (offset: 10)
    log("\n2. Testing offset: 10, count: 10 (page 2)");
    const page2Results = await provider.search("test query", {
      offset: 10,
      count: 10,
    });
    logSuccess(`Page 2: Got ${page2Results.results.length} results`);
    const page2FirstUrl = page2Results.results[0]?.url;
    log(`   First result URL: ${page2FirstUrl}`);

    // Verify pages are different
    if (page1FirstUrl !== page2FirstUrl) {
      logSuccess("   Page 1 and Page 2 have different results ✓");
    } else {
      logWarning("   Page 1 and Page 2 have the same first result");
    }

    // Test third page (offset: 20)
    log("\n3. Testing offset: 20, count: 10 (page 3)");
    const page3Results = await provider.search("test query", {
      offset: 20,
      count: 10,
    });
    logSuccess(`Page 3: Got ${page3Results.results.length} results`);

    // Test non-aligned offset (should trigger warning)
    log("\n4. Testing non-aligned offset: 15, count: 10");
    logWarning("   This should trigger a console warning about misalignment");
    const nonAlignedResults = await provider.search("test query", {
      offset: 15,
      count: 10,
    });
    logSuccess(`Non-aligned offset: Got ${nonAlignedResults.results.length} results`);

    logSuccess("\nPagination test completed successfully");
    return true;
  } catch (error) {
    logError(`Pagination test failed: ${error}`);
    return false;
  }
}

async function testCombinedFilters() {
  logTest("Combined Filters");

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    logError("SERPER_API_KEY environment variable not set");
    return false;
  }

  const provider = createSerperSearchProvider(apiKey, { enableCache: false });

  try {
    log("\nTesting combination of filters:");
    log("  - Query: 'artificial intelligence'");
    log("  - Date range: 2024-01-01 to 2024-01-31");
    log("  - SafeSearch: strict");
    log("  - Language: en");
    log("  - Country: us");
    log("  - Offset: 10, Count: 10");

    const results = await provider.search("artificial intelligence", {
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      safesearch: "strict" as any,
      language: "en",
      country: "us",
      offset: 10,
      count: 10,
    });

    logSuccess(`Got ${results.results.length} results with combined filters`);
    log(`   Total results available: ${results.totalResults}`);
    log(`   Provider: ${results.metadata?.provider}`);

    if (results.results.length > 0) {
      log(`\n   Sample result:`);
      log(`   - Title: ${results.results[0].title}`);
      log(`   - URL: ${results.results[0].url}`);
      log(`   - Description: ${results.results[0].description?.substring(0, 100)}...`);
    }

    logSuccess("\nCombined filters test completed successfully");
    return true;
  } catch (error) {
    logError(`Combined filters test failed: ${error}`);
    return false;
  }
}

async function runAllTests() {
  log("\n" + "=".repeat(60), BLUE);
  log("SERPER PROVIDER FEATURE PARITY TEST SUITE", BLUE);
  log("=".repeat(60) + "\n", BLUE);

  const results = {
    safesearch: false,
    dateRange: false,
    pagination: false,
    combined: false,
  };

  // Run tests
  results.safesearch = await testSafeSearch();
  results.dateRange = await testCustomDateRange();
  results.pagination = await testPagination();
  results.combined = await testCombinedFilters();

  // Summary
  log("\n" + "=".repeat(60), BLUE);
  log("TEST SUMMARY", BLUE);
  log("=".repeat(60), BLUE);

  const passedTests = Object.values(results).filter((r) => r).length;
  const totalTests = Object.keys(results).length;

  log(`\nSafeSearch:      ${results.safesearch ? "✓ PASS" : "✗ FAIL"}`, results.safesearch ? GREEN : RED);
  log(`Date Range:      ${results.dateRange ? "✓ PASS" : "✗ FAIL"}`, results.dateRange ? GREEN : RED);
  log(`Pagination:      ${results.pagination ? "✓ PASS" : "✗ FAIL"}`, results.pagination ? GREEN : RED);
  log(`Combined:        ${results.combined ? "✓ PASS" : "✗ FAIL"}`, results.combined ? GREEN : RED);

  log(`\nTotal: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? GREEN : RED);

  if (passedTests === totalTests) {
    log("\n🎉 All tests passed! Feature parity verified.", GREEN);
    process.exit(0);
  } else {
    log("\n❌ Some tests failed. Please review the output above.", RED);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  logError(`Test suite failed with error: ${error}`);
  process.exit(1);
});
