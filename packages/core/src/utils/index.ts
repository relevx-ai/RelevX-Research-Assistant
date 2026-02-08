/**
 * Pure utility functions that can be safely used in browser or Node.js
 * No Firebase dependencies - safe for Next.js client-side bundling
 */

// Scheduling utilities
export {
  calculateNextRunAt,
  validateFrequency,
  isProjectDue,
} from "./scheduling";

// Date filter utilities
export {
  calculateDateRange,
  calculateDateRangeByFrequency,
  calculateDateRangeByPreference,
  formatReadableDate,
  type DateRange,
} from "./date-filters";

// Deduplication utilities
export { normalizeUrl } from "./deduplication";

// Token estimation utilities
export {
  estimateTokens,
  estimateCost,
  formatCost,
  createTokenUsageTracker,
  addTokenUsage,
  MODEL_PRICING,
  type TokenUsage,
} from "./token-estimation";

// Language validation utilities
export {
  VALID_LANGUAGE_CODES,
  VALID_REGION_CODES,
  sanitizeLanguageCode,
  sanitizeRegionCode,
} from "./language-validation";
