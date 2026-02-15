/**
 * Cross-Source Analysis
 *
 * Performs deep analysis across all sources to identify themes, connections,
 * contradictions, and unique insights before report generation.
 * This is the "thinking" step that enables true synthesis rather than
 * source-by-source summarization.
 */

import { getClient } from "./client";
import { CROSS_SOURCE_ANALYSIS_PROMPTS, renderPrompt } from "./prompts";
import type { ResultForReport, TopicCluster } from "./types";
import { formatReadableDate } from "../../utils/date-filters";

/**
 * Result of cross-source analysis
 */
export interface CrossSourceAnalysis {
  themes: Array<{
    title: string;
    description: string;
    sourceUrls: string[];
    keyFacts: string[];
  }>;
  connections: Array<{
    insight: string;
    sourceUrls: string[];
    significance: string;
  }>;
  contradictions: Array<{
    topic: string;
    claims: Array<{
      claim: string;
      sourceUrl: string;
    }>;
    assessment: string;
  }>;
  uniqueInsights: Array<{
    insight: string;
    sourceUrl: string;
    significance: string;
  }>;
  overallNarrative: string;
}

/**
 * Format sources for the analysis prompt.
 * Accepts either flat results or topic clusters.
 */
function formatSourcesFromResults(results: ResultForReport[]): string {
  const MAX_CONTENT_LENGTH = 3000;

  return results
    .map((r, idx) => {
      const publishedDate = formatReadableDate(r.publishedDate);
      const content = r.fullContent
        ? r.fullContent.substring(0, MAX_CONTENT_LENGTH) +
          (r.fullContent.length > MAX_CONTENT_LENGTH ? "..." : "")
        : r.snippet;

      return `
Source ${idx + 1}:
URL: ${r.url}
Title: ${r.title || "N/A"}
${publishedDate ? `Published: ${publishedDate}` : ""}
Key Points: ${r.keyPoints.join("; ")}
Content:
${content}
---`;
    })
    .join("\n");
}

/**
 * Format sources from topic clusters for the analysis prompt.
 */
function formatSourcesFromClusters(clusters: TopicCluster[]): string {
  const MAX_CONTENT_LENGTH = 2000;
  let sourceIdx = 0;

  return clusters
    .flatMap((cluster) => {
      const allArticles = [
        cluster.primaryArticle,
        ...cluster.relatedArticles,
      ];
      return allArticles.map((a) => {
        sourceIdx++;
        const publishedDate = formatReadableDate(a.publishedDate);
        const content = a.fullContent
          ? a.fullContent.substring(0, MAX_CONTENT_LENGTH) +
            (a.fullContent.length > MAX_CONTENT_LENGTH ? "..." : "")
          : a.snippet;

        return `
Source ${sourceIdx}:
URL: ${a.url}
Title: ${a.title || "N/A"}
${publishedDate ? `Published: ${publishedDate}` : ""}
Key Points: ${a.keyPoints.join("; ")}
Content:
${content}
---`;
      });
    })
    .join("\n");
}

/**
 * Perform cross-source analysis on a set of results
 */
export async function analyzeCrossSources(
  results: ResultForReport[],
  projectTitle: string,
  projectDescription: string
): Promise<CrossSourceAnalysis> {
  const client = getClient();
  const sourcesFormatted = formatSourcesFromResults(results);

  const userPrompt = renderPrompt(CROSS_SOURCE_ANALYSIS_PROMPTS.user, {
    projectTitle,
    projectDescription,
    sourcesFormatted,
  });

  const response = await client.chat.completions.create({
    model: CROSS_SOURCE_ANALYSIS_PROMPTS.model,
    temperature: CROSS_SOURCE_ANALYSIS_PROMPTS.temperature ?? 0.4,
    messages: [
      { role: "system", content: CROSS_SOURCE_ANALYSIS_PROMPTS.system },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: CROSS_SOURCE_ANALYSIS_PROMPTS.responseFormat || "json_object",
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in cross-source analysis response");
  }

  return JSON.parse(content) as CrossSourceAnalysis;
}

/**
 * Perform cross-source analysis on topic clusters
 */
export async function analyzeClusteredCrossSources(
  clusters: TopicCluster[],
  projectTitle: string,
  projectDescription: string
): Promise<CrossSourceAnalysis> {
  const client = getClient();
  const sourcesFormatted = formatSourcesFromClusters(clusters);

  const userPrompt = renderPrompt(CROSS_SOURCE_ANALYSIS_PROMPTS.user, {
    projectTitle,
    projectDescription,
    sourcesFormatted,
  });

  const response = await client.chat.completions.create({
    model: CROSS_SOURCE_ANALYSIS_PROMPTS.model,
    temperature: CROSS_SOURCE_ANALYSIS_PROMPTS.temperature ?? 0.4,
    messages: [
      { role: "system", content: CROSS_SOURCE_ANALYSIS_PROMPTS.system },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: CROSS_SOURCE_ANALYSIS_PROMPTS.responseFormat || "json_object",
    },
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No content in cross-source analysis response");
  }

  return JSON.parse(content) as CrossSourceAnalysis;
}

/**
 * Perform cross-source analysis with retry logic
 */
export async function analyzeCrossSourcesWithRetry(
  results: ResultForReport[],
  projectTitle: string,
  projectDescription: string,
  maxRetries: number = 2
): Promise<CrossSourceAnalysis> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeCrossSources(results, projectTitle, projectDescription);
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Cross-source analysis attempt ${attempt}/${maxRetries} failed:`,
        error
      );

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed cross-source analysis after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Perform clustered cross-source analysis with retry logic
 */
export async function analyzeClusteredCrossSourcesWithRetry(
  clusters: TopicCluster[],
  projectTitle: string,
  projectDescription: string,
  maxRetries: number = 2
): Promise<CrossSourceAnalysis> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await analyzeClusteredCrossSources(
        clusters,
        projectTitle,
        projectDescription
      );
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Clustered cross-source analysis attempt ${attempt}/${maxRetries} failed:`,
        error
      );

      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(
    `Failed clustered cross-source analysis after ${maxRetries} attempts: ${lastError?.message}`
  );
}

/**
 * Format cross-source analysis results as context for the report compilation step.
 * This is injected into the report prompt so the LLM can use it for synthesis.
 */
export function formatAnalysisForReport(
  analysis: CrossSourceAnalysis
): string {
  const sections: string[] = [];

  sections.push("=== CROSS-SOURCE ANALYSIS ===\n");

  // Overall narrative
  sections.push(`OVERALL NARRATIVE:\n${analysis.overallNarrative}\n`);

  // Themes
  if (analysis.themes.length > 0) {
    sections.push("IDENTIFIED THEMES:");
    for (const theme of analysis.themes) {
      sections.push(`  Theme: ${theme.title}`);
      sections.push(`  Description: ${theme.description}`);
      sections.push(`  Key Facts: ${theme.keyFacts.join("; ")}`);
      sections.push(`  Sources: ${theme.sourceUrls.join(", ")}`);
      sections.push("");
    }
  }

  // Connections
  if (analysis.connections.length > 0) {
    sections.push("CROSS-SOURCE CONNECTIONS:");
    for (const conn of analysis.connections) {
      sections.push(`  Insight: ${conn.insight}`);
      sections.push(`  Significance: ${conn.significance}`);
      sections.push(`  Sources: ${conn.sourceUrls.join(", ")}`);
      sections.push("");
    }
  }

  // Contradictions
  if (analysis.contradictions.length > 0) {
    sections.push("CONTRADICTIONS & DISAGREEMENTS:");
    for (const contra of analysis.contradictions) {
      sections.push(`  Topic: ${contra.topic}`);
      for (const claim of contra.claims) {
        sections.push(`    - ${claim.claim} (${claim.sourceUrl})`);
      }
      sections.push(`  Assessment: ${contra.assessment}`);
      sections.push("");
    }
  }

  // Unique insights
  if (analysis.uniqueInsights.length > 0) {
    sections.push("UNIQUE INSIGHTS:");
    for (const unique of analysis.uniqueInsights) {
      sections.push(`  - ${unique.insight} (${unique.sourceUrl})`);
      sections.push(`    Significance: ${unique.significance}`);
    }
  }

  sections.push("\n=== END CROSS-SOURCE ANALYSIS ===");

  return sections.join("\n");
}
