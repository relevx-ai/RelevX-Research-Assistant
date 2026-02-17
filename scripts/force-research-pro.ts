/**
 * Force Research Run with Pro Feature Overrides
 *
 * Forces a research run on a Firestore project, temporarily injecting
 * pro search parameters (language, region, output language) before execution.
 * The project's searchParameters are updated in Firestore before the run
 * and restored to their original values after completion.
 *
 * Usage:
 *   pnpm tsx scripts/force-research-pro.ts <projectId> <userId> [options]
 *
 * Examples:
 *   # Search in Spanish
 *   pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=es
 *
 *   # Search in Japanese from Japan region
 *   pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=ja --region=JP
 *
 *   # Search in German, translate report to English
 *   pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=de --output-language=en
 *
 * Options:
 *   --language=<code>        ISO 639-1 search language (e.g., "es", "ja", "de")
 *   --region=<code>          ISO 3166-1 alpha-2 region (e.g., "US", "JP", "DE")
 *   --output-language=<code> ISO 639-1 report translation language (e.g., "en", "de")
 *   --iterations=N           Max research iterations (default: 3)
 *   --no-restore             Don't restore original searchParameters after run
 *
 * Environment variables required:
 *   OPENAI_API_KEY
 *   SERPER_API_KEY (default) or BRAVE_SEARCH_API_KEY (if config uses brave)
 *   FIREBASE_SERVICE_ACCOUNT_JSON
 *   RESEND_API_KEY
 *   RESEND_FROM_EMAIL
 */

// Load environment variables from .env file
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

import {
  executeResearchForProject,
  setDefaultProviders,
  loadConfig,
  db,
} from "../packages/core/src";
import { createOpenAIProvider } from "../packages/core/src/services/llm";
import {
  createBraveSearchProvider,
  createSerperSearchProvider,
} from "../packages/core/src/services/search";
import { sendReportEmail } from "../packages/core/src/services/email";
import type { Project, SearchParameters } from "../packages/core/src";
import type { SearchProvider } from "../packages/core/src/interfaces/search-provider";

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

function langName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

function regionName(code: string): string {
  return REGION_NAMES[code] || code;
}

async function forceResearchWithProFeatures(
  userId: string,
  projectId: string,
  proOverrides: {
    language?: string;
    region?: string;
    outputLanguage?: string;
  },
  options: {
    maxIterations: number;
    restoreAfter: boolean;
  }
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("  FORCE RESEARCH WITH PRO FEATURES");
  console.log("=".repeat(60) + "\n");

  console.log(`User ID:        ${userId}`);
  console.log(`Project ID:     ${projectId}`);
  console.log(`Max Iterations: ${options.maxIterations}`);
  console.log(`Restore After:  ${options.restoreAfter ? "Yes" : "No"}\n`);

  console.log("Pro Feature Overrides:");
  if (proOverrides.language)
    console.log(`  Language:        ${proOverrides.language} (${langName(proOverrides.language)})`);
  if (proOverrides.region)
    console.log(`  Region:          ${proOverrides.region} (${regionName(proOverrides.region)})`);
  if (proOverrides.outputLanguage)
    console.log(`  Output Language: ${proOverrides.outputLanguage} (${langName(proOverrides.outputLanguage)})`);
  if (!proOverrides.language && !proOverrides.region && !proOverrides.outputLanguage)
    console.log("  (none specified - using project defaults)");
  console.log();

  const startTime = Date.now();
  const projectRef = db
    .collection("users")
    .doc(userId)
    .collection("projects")
    .doc(projectId);

  let originalSearchParams: SearchParameters | undefined;

  try {
    // 1. Load project
    console.log("Loading project...");
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      throw new Error(`Project not found: ${projectId} for user ${userId}`);
    }

    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;

    console.log(`Project found: "${project.title}"`);
    console.log(`  Status:      ${project.status}`);
    console.log(`  Frequency:   ${project.frequency}`);
    console.log(`  Description: ${project.description.slice(0, 100)}${project.description.length > 100 ? "..." : ""}`);

    // Save original search parameters
    originalSearchParams = project.searchParameters
      ? { ...project.searchParameters }
      : undefined;

    console.log("\nOriginal searchParameters:");
    if (originalSearchParams) {
      if (originalSearchParams.language) console.log(`  language:       ${originalSearchParams.language}`);
      if (originalSearchParams.region) console.log(`  region:         ${originalSearchParams.region}`);
      if (originalSearchParams.outputLanguage) console.log(`  outputLanguage: ${originalSearchParams.outputLanguage}`);
      if (originalSearchParams.priorityDomains?.length)
        console.log(`  priorityDomains: [${originalSearchParams.priorityDomains.join(", ")}]`);
      if (originalSearchParams.excludedDomains?.length)
        console.log(`  excludedDomains: [${originalSearchParams.excludedDomains.join(", ")}]`);
      if (originalSearchParams.requiredKeywords?.length)
        console.log(`  requiredKeywords: [${originalSearchParams.requiredKeywords.join(", ")}]`);
      if (originalSearchParams.excludedKeywords?.length)
        console.log(`  excludedKeywords: [${originalSearchParams.excludedKeywords.join(", ")}]`);
      if (originalSearchParams.dateRangePreference)
        console.log(`  dateRange:      ${originalSearchParams.dateRangePreference}`);
    } else {
      console.log("  (none set)");
    }

    // 2. Apply pro feature overrides
    const mergedParams: SearchParameters = {
      ...(originalSearchParams || {}),
    };

    if (proOverrides.language) mergedParams.language = proOverrides.language;
    if (proOverrides.region) mergedParams.region = proOverrides.region;
    if (proOverrides.outputLanguage) mergedParams.outputLanguage = proOverrides.outputLanguage;

    console.log("\nMerged searchParameters for this run:");
    if (mergedParams.language) console.log(`  language:        ${mergedParams.language} (${langName(mergedParams.language)})`);
    if (mergedParams.region) console.log(`  region:          ${mergedParams.region} (${regionName(mergedParams.region)})`);
    if (mergedParams.outputLanguage) console.log(`  outputLanguage:  ${mergedParams.outputLanguage} (${langName(mergedParams.outputLanguage)})`);

    // 3. Update project in Firestore with overridden params
    console.log("\nUpdating project searchParameters in Firestore...");
    await projectRef.update({ searchParameters: mergedParams });
    console.log("Project updated.\n");

    // 4. Execute research
    console.log("Executing research...\n");
    console.log("-".repeat(60));

    const result = await executeResearchForProject(userId, projectId, {
      maxIterations: options.maxIterations,
      ignoreFrequencyCheck: true,
      forceResearch: true,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("-".repeat(60));
    console.log("\n" + "=".repeat(60));
    console.log("  RESEARCH RESULTS");
    console.log("=".repeat(60) + "\n");

    console.log(`Status:     ${result.success ? "SUCCESS" : "FAILED"}`);
    console.log(`Duration:   ${duration}s`);
    console.log(`Iterations: ${result.iterationsUsed}\n`);

    console.log("Queries:");
    console.log(`  Generated: ${result.queriesGenerated.length}`);
    console.log(`  Executed:  ${result.queriesExecuted.length}\n`);

    console.log("URLs:");
    console.log(`  Fetched:     ${result.urlsFetched}`);
    console.log(`  Successful:  ${result.urlsSuccessful}`);
    console.log(`  Relevant:    ${result.urlsRelevant}\n`);

    console.log("Results:");
    console.log(`  Total Analyzed:       ${result.totalResultsAnalyzed}`);
    console.log(`  Included in Report:   ${result.relevantResults.length}\n`);

    if (result.relevantResults.length > 0) {
      console.log("Top Results:");
      result.relevantResults.slice(0, 5).forEach((r, idx) => {
        console.log(`  ${idx + 1}. [${r.relevancyScore}] ${r.metadata.title}`);
        console.log(`     ${r.url}`);
      });
      console.log();
    }

    if (result.report) {
      console.log("Report:");
      console.log(`  Title:         ${result.report.title}`);
      console.log(`  Result Count:  ${result.relevantResults.length}`);
      console.log(`  Average Score: ${result.report.averageScore}\n`);

      // Show report preview
      console.log("-".repeat(60));
      console.log("REPORT PREVIEW:");
      console.log("-".repeat(60));
      console.log(result.report.markdown.slice(0, 2000));
      if (result.report.markdown.length > 2000) {
        console.log(
          `\n... (${result.report.markdown.length - 2000} chars truncated)`
        );
      }
      console.log("-".repeat(60) + "\n");
    }

    // 5. Send email (forceResearch skips DB writes so scheduler won't deliver)
    if (result.report) {
      const userDoc = await db.collection("users").doc(userId).get();
      const userEmail = userDoc.exists ? userDoc.data()?.email : undefined;
      const deliveryEmail =
        project.deliveryConfig?.email?.address || userEmail;

      if (deliveryEmail) {
        console.log(`Sending report email to ${deliveryEmail}...`);

        const emailResult = await sendReportEmail(
          deliveryEmail,
          {
            title: result.report.title,
            markdown: result.report.markdown,
          },
          projectId,
          project.title,
          {
            summary: result.report.summary,
            resultCount: result.relevantResults.length,
            averageScore: Math.round(result.report.averageScore),
          }
        );

        if (emailResult.success) {
          console.log(`Email sent successfully (ID: ${emailResult.id})\n`);
        } else {
          console.error(`Failed to send email: ${emailResult.error}\n`);
        }
      } else {
        console.log("No email address configured, skipping email delivery.\n");
      }
    }

    if (result.error) {
      console.error(`Error: ${result.error}\n`);
    }
  } finally {
    // 7. Restore original searchParameters
    if (options.restoreAfter) {
      console.log("Restoring original searchParameters...");
      try {
        if (originalSearchParams) {
          await projectRef.update({ searchParameters: originalSearchParams });
        } else {
          // If there were no original params, remove the field
          const { FieldValue } = await import("firebase-admin/firestore");
          await projectRef.update({
            searchParameters: FieldValue.delete(),
          });
        }
        console.log("Original searchParameters restored.\n");
      } catch (restoreError: any) {
        console.error(
          `WARNING: Failed to restore searchParameters: ${restoreError.message}`
        );
        console.error(
          "You may need to manually restore the project's searchParameters.\n"
        );
      }
    } else {
      console.log(
        "Skipping restore (--no-restore). Project keeps the overridden searchParameters.\n"
      );
    }
  }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse positional args
  const positionalArgs = args.filter((a) => !a.startsWith("--"));
  if (positionalArgs.length < 2) {
    console.error("\nMissing required arguments\n");
    console.error("Usage:");
    console.error(
      "  pnpm tsx scripts/force-research-pro.ts <projectId> <userId> [options]\n"
    );
    console.error("Options:");
    console.error('  --language=<code>        Search language (e.g., "es", "ja")');
    console.error('  --region=<code>          Search region (e.g., "US", "JP")');
    console.error('  --output-language=<code> Report translation language (e.g., "en", "de")');
    console.error("  --iterations=N           Max iterations (default: 3)");
    console.error("  --no-restore             Keep overridden params after run\n");
    console.error("Examples:");
    console.error(
      "  pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=es"
    );
    console.error(
      "  pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=ja --region=JP --output-language=en"
    );
    console.error(
      "  pnpm tsx scripts/force-research-pro.ts abc123 user_xyz --language=de --output-language=en\n"
    );
    process.exit(1);
  }

  const [projectId, userId] = positionalArgs;

  // Parse options
  const getArg = (name: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(`--${name}=`));
    return arg ? arg.split("=").slice(1).join("=") : undefined;
  };
  const hasFlag = (name: string): boolean => args.includes(`--${name}`);

  const language = getArg("language");
  const region = getArg("region");
  const outputLanguage = getArg("output-language");
  const iterationsStr = getArg("iterations");
  const maxIterations = iterationsStr ? parseInt(iterationsStr, 10) : 3;
  const noRestore = hasFlag("no-restore");

  // Load config to determine search provider
  const config = loadConfig();
  const searchProviderName = config.search?.provider || "serper";

  // Determine required env vars based on configured search provider
  const searchEnvVar =
    searchProviderName === "brave" ? "BRAVE_SEARCH_API_KEY" : "SERPER_API_KEY";

  const requiredEnvVars = [
    "OPENAI_API_KEY",
    searchEnvVar,
    "FIREBASE_SERVICE_ACCOUNT_JSON",
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
  ];

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

  const llmProvider = createOpenAIProvider(openaiKey);

  let searchProvider: SearchProvider;
  if (searchProviderName === "brave") {
    searchProvider = createBraveSearchProvider(process.env.BRAVE_SEARCH_API_KEY!);
  } else {
    searchProvider = createSerperSearchProvider(process.env.SERPER_API_KEY!);
  }

  setDefaultProviders(llmProvider, searchProvider);
  console.log(`Providers initialized (OpenAI + ${searchProvider.getName()})`);

  try {
    await forceResearchWithProFeatures(
      userId,
      projectId,
      { language, region, outputLanguage },
      { maxIterations, restoreAfter: !noRestore }
    );

    console.log("=".repeat(60));
    console.log("  FORCE RESEARCH (PRO) COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60) + "\n");
  } catch (error: any) {
    console.error("\n" + "=".repeat(60));
    console.error("  FORCE RESEARCH (PRO) FAILED");
    console.error("=".repeat(60) + "\n");
    console.error("Error:", error.message);
    if (error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
