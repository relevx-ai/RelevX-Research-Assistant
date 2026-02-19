/**
 * Research Engine service
 *
 * Core orchestrator that coordinates the full research flow:
 * 1. Generate search queries (via OpenRouter)
 * 2. Execute searches (via Search provider)
 * 3. Extract content from URLs
 * 4. Analyze relevancy (via OpenRouter)
 * 5. Compile report (via OpenRouter)
 * 6. Save results and update project
 *
 * Configuration is loaded from research-config.yaml.
 */

export { executeResearchForProject, setDefaultSearchProvider } from "./orchestrator";
export { getSearchHistory, updateSearchHistory } from "./search-history";
export { saveDeliveryLog } from "./result-storage";
export type { ResearchOptions, ResearchResult, ModelOverrides } from "./types";

// Config exports
export {
  loadConfig,
  getConfig,
  clearConfigCache,
  getConfigPath,
  withConfigOverrides,
  getModelConfig,
  getDefaultSearchProvider,
  getExtractionConfig,
  getResearchConfig,
  getReportConfig,
  getLimitsConfig,
  getSearchConfig,
  DEFAULT_CONFIG,
} from "./config";

export type {
  ResearchConfig,
  ModelConfig,
  LLMConfig,
  SearchConfig,
  ExtractionConfig,
  ResearchPipelineConfig,
  ReportConfig,
  LimitsConfig,
} from "./config";
