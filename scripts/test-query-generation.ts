/**
 * Test script for query generation from project descriptions
 *
 * Usage:
 *   pnpm test:queries "Your project description here"
 *
 * Environment variables required:
 *   OPENROUTER_API_KEY
 */

import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

import {
  initializeOpenRouter,
  generateSearchQueriesWithRetry,
} from "../packages/core/src/services/llm";

async function main() {
  // Get description from command line
  const description = process.argv[2];
  if (!description) {
    console.error("Usage: pnpm test:queries \"Your project description here\"");
    process.exit(1);
  }

  // Check for API key
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (!openrouterKey) {
    console.error("Error: OPENROUTER_API_KEY not set");
    process.exit(1);
  }

  // Initialize OpenRouter client
  initializeOpenRouter(openrouterKey);

  console.log("=".repeat(70));
  console.log("PROJECT DESCRIPTION:");
  console.log("=".repeat(70));
  console.log(description);
  console.log("\n" + "=".repeat(70));
  console.log("GENERATED QUERIES:");
  console.log("=".repeat(70) + "\n");

  try {
    const startTime = Date.now();
    const queries = await generateSearchQueriesWithRetry(description);
    const duration = Date.now() - startTime;

    queries.forEach((q, idx) => {
      console.log(`${idx + 1}. [${q.type.toUpperCase().padEnd(8)}] "${q.query}"`);
      console.log(`   Reasoning: ${q.reasoning}\n`);
    });

    console.log("=".repeat(70));
    console.log(`Generated ${queries.length} queries in ${duration}ms`);
    console.log("=".repeat(70));
  } catch (error: any) {
    console.error("Error:", error.message);
    process.exit(1);
  }
}

main();
