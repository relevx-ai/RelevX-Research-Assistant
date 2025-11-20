/**
 * Research Engine service
 *
 * Core orchestrator that coordinates the full research flow:
 * 1. Generate search queries (OpenAI)
 * 2. Execute searches (Brave Search)
 * 3. Extract content from URLs
 * 4. Analyze relevancy (OpenAI)
 * 5. Compile report (OpenAI)
 * 6. Save results and update project
 *
 * Includes retry logic and deduplication.
 */

export {
  executeResearchForProject,
  executeResearchBatch,
} from "./orchestrator";
export { getSearchHistory, updateSearchHistory } from "./search-history";
export { saveSearchResults, saveDeliveryLog } from "./result-storage";
export type { ResearchOptions, ResearchResult } from "./types";
