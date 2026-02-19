/**
 * LLM service functions
 */

export { initializeOpenRouter, getClient } from "./client";

export { translateText, translateShortText } from "./translation";

export {
  generateSearchQueries,
  generateSearchQueriesWithRetry,
} from "./query-generation";

export {
  analyzeRelevancy,
  analyzeRelevancyWithRetry,
} from "./relevancy-analysis";

export {
  filterSearchResults,
  filterSearchResultsSafe,
} from "./search-filtering";

export {
  compileReport,
  compileReportWithRetry,
  compileClusteredReport,
  compileClusteredReportWithRetry,
  generateReportSummary,
  generateReportSummaryWithRetry,
  type CompileReportOptions,
  type CompileClusteredReportOptions,
  type GenerateSummaryOptions,
} from "./report-compilation";

export {
  analyzeCrossSources,
  analyzeCrossSourcesWithRetry,
  analyzeClusteredCrossSources,
  analyzeClusteredCrossSourcesWithRetry,
  formatAnalysisForReport,
  type CrossSourceAnalysis,
} from "./cross-source-analysis";

export {
  QUERY_GENERATION_PROMPTS,
  RELEVANCY_ANALYSIS_PROMPTS,
  CROSS_SOURCE_ANALYSIS_PROMPTS,
  REPORT_COMPILATION_PROMPTS,
  CLUSTERED_REPORT_COMPILATION_PROMPTS,
  renderPrompt,
  getPromptConfig,
  type PromptConfig,
  type PromptType,
} from "./prompts";

export type {
  GeneratedQuery,
  ContentToAnalyze,
  RelevancyResult,
  ResultForReport,
  CompiledReport,
  TopicCluster,
  ArticleSource,
} from "./types";
