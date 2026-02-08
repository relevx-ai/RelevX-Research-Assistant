/**
 * Test script for Pro features (language, region, translation)
 *
 * Tests each pro feature individually and in combination using
 * real API calls but without requiring a Firestore project.
 *
 * Usage:
 *   pnpm tsx scripts/test-pro-features.ts
 *   pnpm tsx scripts/test-pro-features.ts --language=es
 *   pnpm tsx scripts/test-pro-features.ts --language=ja --region=JP
 *   pnpm tsx scripts/test-pro-features.ts --language=es --output-language=en
 *   pnpm tsx scripts/test-pro-features.ts --all
 *
 * Options:
 *   --language=<code>        ISO 639-1 language code for search (e.g., "es", "ja", "de")
 *   --region=<code>          ISO 3166-1 alpha-2 region code (e.g., "US", "JP", "DE")
 *   --output-language=<code> ISO 639-1 language code for report translation (e.g., "en", "de")
 *   --description=<text>     Custom project description to search for
 *   --all                    Run all pro feature test scenarios
 *
 * Environment variables required:
 *   OPENAI_API_KEY
 *   BRAVE_SEARCH_API_KEY
 */

// Load environment variables from .env file
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

import { setDefaultProviders } from "../packages/core/src/services/research-engine";
import { createOpenAIProvider } from "../packages/core/src/services/llm";
import { createBraveSearchProvider } from "../packages/core/src/services/search";
import { generateSearchQueriesWithRetry } from "../packages/core/src/services/llm";
import { searchMultipleQueries } from "../packages/core/src/services/brave-search";
import { extractMultipleContents } from "../packages/core/src/services/content-extractor";
import { analyzeRelevancyWithRetry } from "../packages/core/src/services/llm";
import { compileReportWithRetry } from "../packages/core/src/services/llm";
import type { SearchFilters } from "../packages/core/src/interfaces";
import type { SearchParameters } from "../packages/core/src/models/project";

// Language display names for output
const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  ja: "Japanese",
  zh: "Chinese",
  ar: "Arabic",
  pt: "Portuguese",
  ru: "Russian",
  ko: "Korean",
  it: "Italian",
  nl: "Dutch",
};

const REGION_NAMES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  JP: "Japan",
  CN: "China",
  ES: "Spain",
  IT: "Italy",
  CA: "Canada",
  AU: "Australia",
  IN: "India",
  BR: "Brazil",
};

interface TestScenario {
  name: string;
  description: string;
  searchParams: SearchParameters;
  projectDescription: string;
}

const DEFAULT_DESCRIPTION =
  "Latest developments in artificial intelligence and machine learning";

/**
 * Run a single pro feature test scenario
 */
async function runScenario(scenario: TestScenario): Promise<void> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(60));
  console.log(`  TEST: ${scenario.name}`);
  console.log("=".repeat(60));
  console.log(`  ${scenario.description}\n`);

  const params = scenario.searchParams;
  if (params.language)
    console.log(
      `  Language:        ${params.language} (${LANGUAGE_NAMES[params.language] || params.language})`
    );
  if (params.region)
    console.log(
      `  Region:          ${params.region} (${REGION_NAMES[params.region] || params.region})`
    );
  if (params.outputLanguage)
    console.log(
      `  Output Language: ${params.outputLanguage} (${LANGUAGE_NAMES[params.outputLanguage] || params.outputLanguage})`
    );
  console.log(`  Search Topic:    ${scenario.projectDescription}\n`);

  // Step 1: Query Generation
  console.log("1. Generating search queries...");
  const queries = await generateSearchQueriesWithRetry(
    scenario.projectDescription,
    scenario.searchParams
  );
  console.log(`   Generated ${queries.length} queries:`);
  queries.forEach((q, i) => console.log(`     ${i + 1}. ${q.query}`));
  console.log();

  // Step 2: Search with filters
  console.log("2. Executing search with pro filters...");
  const searchFilters: SearchFilters = {
    count: 5,
    freshness: "pw", // past week
  };
  if (params.language) searchFilters.language = params.language;
  if (params.region) searchFilters.country = params.region;

  const searchResults = await searchMultipleQueries(
    queries.slice(0, 2).map((q) => q.query),
    searchFilters
  );

  let totalResults = 0;
  for (const [query, response] of searchResults.entries()) {
    console.log(`   Query: "${query}"`);
    console.log(`     Results: ${response.results.length}`);
    response.results.slice(0, 3).forEach((r) => {
      console.log(`       - ${r.title}`);
      if (r.language) console.log(`         Language: ${r.language}`);
    });
    totalResults += response.results.length;
  }
  console.log(`   Total results: ${totalResults}\n`);

  if (totalResults === 0) {
    console.log("   No results found, skipping remaining steps.\n");
    return;
  }

  // Step 3: Content Extraction
  console.log("3. Extracting content...");
  const urls: string[] = [];
  for (const response of searchResults.values()) {
    urls.push(...response.results.slice(0, 3).map((r) => r.url));
  }

  const extractedContents = await extractMultipleContents(
    urls.slice(0, 5),
    undefined,
    2
  );

  const successfulExtractions = extractedContents.filter(
    (c) => c.fetchStatus === "success" && c.snippet.length > 0
  );
  console.log(
    `   Extracted ${successfulExtractions.length}/${extractedContents.length} URLs successfully\n`
  );

  if (successfulExtractions.length === 0) {
    console.log("   No content extracted, skipping remaining steps.\n");
    return;
  }

  // Step 4: Relevancy Analysis
  console.log("4. Analyzing relevancy...");
  const contentsToAnalyze = successfulExtractions.map((c) => ({
    url: c.url,
    title: c.title,
    snippet: c.snippet,
    publishedDate: c.metadata.publishedDate,
  }));

  const relevancyResults = await analyzeRelevancyWithRetry(
    contentsToAnalyze,
    scenario.projectDescription
  );

  const relevantResults = relevancyResults.filter((r) => r.isRelevant);
  console.log(
    `   ${relevantResults.length}/${relevancyResults.length} results relevant (threshold: 60)`
  );
  relevancyResults.forEach((r) => {
    console.log(`     [${r.score}] ${r.isRelevant ? "PASS" : "FAIL"} - ${r.url.slice(0, 80)}`);
  });
  console.log();

  // Step 5: Report Compilation
  if (relevantResults.length > 0) {
    console.log("5. Compiling report...");

    const resultsForReport = relevantResults.map((r) => ({
      url: r.url,
      title: successfulExtractions.find((c) => c.url === r.url)?.title,
      snippet: r.keyPoints.join(". "),
      score: r.score,
      keyPoints: r.keyPoints,
    }));

    const report = await compileReportWithRetry({
      results: resultsForReport,
      projectTitle: scenario.name,
      projectDescription: scenario.projectDescription,
      frequency: "weekly",
    });

    console.log(`   Report compiled (${report.resultCount} results, avg score: ${report.averageScore})\n`);

    // Step 6: Translation (if outputLanguage differs from search language)
    if (params.outputLanguage) {
      const searchLang = params.language || "en";
      const outputLang = params.outputLanguage;

      if (outputLang !== searchLang) {
        console.log(
          `6. Translating report from ${searchLang} (${LANGUAGE_NAMES[searchLang]}) to ${outputLang} (${LANGUAGE_NAMES[outputLang]})...`
        );

        const openaiKey = process.env.OPENAI_API_KEY!;
        const provider = createOpenAIProvider(openaiKey);

        const translatedMarkdown = await provider.translateText(
          report.markdown,
          searchLang,
          outputLang
        );

        console.log(`   Translation completed!`);
        console.log(`   Original length:   ${report.markdown.length} chars`);
        console.log(`   Translated length: ${translatedMarkdown.length} chars\n`);

        // Show translated report
        console.log("-".repeat(60));
        console.log("TRANSLATED REPORT:");
        console.log("-".repeat(60));
        console.log(translatedMarkdown.slice(0, 2000));
        if (translatedMarkdown.length > 2000) {
          console.log(`\n... (${translatedMarkdown.length - 2000} chars truncated)`);
        }
        console.log("-".repeat(60) + "\n");
      } else {
        console.log(
          `6. Skipping translation (output language matches search language: ${outputLang})\n`
        );
      }
    } else {
      // Show original report preview
      console.log("-".repeat(60));
      console.log("REPORT PREVIEW:");
      console.log("-".repeat(60));
      console.log(report.markdown.slice(0, 1500));
      if (report.markdown.length > 1500) {
        console.log(`\n... (${report.markdown.length - 1500} chars truncated)`);
      }
      console.log("-".repeat(60) + "\n");
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`Scenario completed in ${duration}s\n`);
}

/**
 * Build predefined test scenarios for --all mode
 */
function getAllScenarios(): TestScenario[] {
  return [
    {
      name: "Spanish Language Search",
      description: "Search in Spanish with default (English) output",
      searchParams: { language: "es" },
      projectDescription:
        "Desarrollos recientes en inteligencia artificial y aprendizaje automatico",
    },
    {
      name: "Japanese Region Search",
      description: "Search filtered to Japan region",
      searchParams: { region: "JP", language: "en" },
      projectDescription: DEFAULT_DESCRIPTION,
    },
    {
      name: "German Search + French Translation",
      description: "Search in German, translate report to French",
      searchParams: { language: "de", region: "DE", outputLanguage: "fr" },
      projectDescription:
        "Neueste Entwicklungen in kunstlicher Intelligenz und maschinellem Lernen",
    },
    {
      name: "English Search + Spanish Output",
      description: "Search in English, translate report to Spanish",
      searchParams: { language: "en", region: "US", outputLanguage: "es" },
      projectDescription: DEFAULT_DESCRIPTION,
    },
  ];
}

async function main() {
  console.log("=".repeat(60));
  console.log("  PRO FEATURES TEST");
  console.log("=".repeat(60));

  const args = process.argv.slice(2);

  // Validate environment variables
  const requiredEnvVars = ["OPENAI_API_KEY", "BRAVE_SEARCH_API_KEY"];
  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error("\nMissing required environment variables:");
    missingVars.forEach((v) => console.error(`  - ${v}`));
    console.error("\nPlease set these in your .env file.\n");
    process.exit(1);
  }

  // Initialize providers
  console.log("\nInitializing providers...");
  const openaiKey = process.env.OPENAI_API_KEY!;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY!;

  const llmProvider = createOpenAIProvider(openaiKey);
  const searchProvider = createBraveSearchProvider(braveKey);
  setDefaultProviders(llmProvider, searchProvider);
  console.log("Providers initialized (OpenAI + Brave Search)");

  // Parse CLI args
  const getArg = (name: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=").slice(1).join("=") : undefined;
  };
  const hasFlag = (name: string): boolean => args.includes(`--${name}`);

  if (hasFlag("all")) {
    // Run all predefined scenarios
    console.log("\nRunning all pro feature test scenarios...\n");
    const scenarios = getAllScenarios();

    for (let i = 0; i < scenarios.length; i++) {
      console.log(
        `\n${"#".repeat(60)}\n  SCENARIO ${i + 1}/${scenarios.length}\n${"#".repeat(60)}`
      );
      try {
        await runScenario(scenarios[i]);
      } catch (error: any) {
        console.error(`  FAILED: ${error.message}\n`);
      }
    }
  } else {
    // Build a single scenario from CLI args
    const language = getArg("language");
    const region = getArg("region");
    const outputLanguage = getArg("output-language");
    const description = getArg("description") || DEFAULT_DESCRIPTION;

    if (!language && !region && !outputLanguage) {
      console.log("\nNo pro features specified. Running with defaults (language=es, region=US).");
      console.log("Use --language, --region, --output-language, or --all for specific tests.\n");
    }

    const searchParams: SearchParameters = {};
    if (language) searchParams.language = language;
    if (region) searchParams.region = region;
    if (outputLanguage) searchParams.outputLanguage = outputLanguage;

    // Default to a basic language test if nothing specified
    if (!language && !region && !outputLanguage) {
      searchParams.language = "es";
      searchParams.region = "US";
    }

    const parts: string[] = [];
    if (searchParams.language) parts.push(`lang=${searchParams.language}`);
    if (searchParams.region) parts.push(`region=${searchParams.region}`);
    if (searchParams.outputLanguage)
      parts.push(`output=${searchParams.outputLanguage}`);

    await runScenario({
      name: `Custom Pro Feature Test (${parts.join(", ")})`,
      description: "Manual pro feature test from CLI arguments",
      searchParams,
      projectDescription: description,
    });
  }

  console.log("=".repeat(60));
  console.log("  PRO FEATURES TEST COMPLETE");
  console.log("=".repeat(60) + "\n");
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("\nTest failed:", error.message);
    process.exit(1);
  });
}
