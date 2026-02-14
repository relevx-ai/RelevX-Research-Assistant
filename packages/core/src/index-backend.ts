/**
 * Core package entry point
 *
 * Exports all shared business logic, types, and hooks.
 */

// Models
export type {
  Project,
  ProjectInfo,
  NewProject,
  Frequency,
  ResultsDestination,
  ProjectStatus,
  DateRangePreference,
  SearchParameters,
  ProjectSettings,
  DeliveryConfig,
  ListProjectsResponse,
  CreateProjectRequest,
  CreateProjectResponse,
  ToggleProjectStatusResponse,
} from "./models/project";

export type { Plan, PlanInfo, FetchPlansResponse } from "./models/plans";

export type {
  RelevxUserBilling,
  BillingIntentResponse,
  BillingPaymentLinkResponse,
  BillingPortalLinkResponse,
  ActivateFreeTrialRequest,
  ActivateFreeTrialResponse,
} from "./models/billing.js";

export type {
  RelevxUser,
  RelevxUserProfile,
  CreateProfileRequest,
  CreateProfileResponse,
} from "./models/users";

export type {
  RelevxDeliveryLog,
  DeliveryLog,
  NewDeliveryLog,
  ProjectDeliveryLogResponse,
} from "./models/delivery-log";

export type {
  AnalyticsDocument,
  TopDownAnalyticsDocument,
  UserAnalyticsDocument,
} from "./models/analytics";

export {
  getUserAnalytics,
  getUserOneShotCount,
  incrementUserOneShotRun,
  kAnalyticsCollectionTopDown,
  kAnalyticsUserCollection,
  kAnalyticsUserMonthlyDoc,
  kAnalyticsDailyDateKey,
  kAnalyticsMonthlyDateKey,
} from "./utils/analytics";

export type {
  ImproveProjectDescriptionRequest,
  ImproveProjectDescriptionResponse,
  ValidateProjectDescriptionResult,
} from "./models/ai";

export { validateProjectDescription } from "./services/project-description-validation";

export { OpenAIProvider, createOpenAIProvider } from "./services/llm";
export type { LLMProvider } from "./interfaces/llm-provider";

export {
  sanitizeLanguageCode,
  sanitizeRegionCode,
} from "./utils/language-validation";

// Firebase (server-side only)
export { db } from "./services/firebase";

// Research engine
export {
  executeResearchForProject,
  setDefaultProviders,
  loadConfig,
} from "./services/research-engine";

// Search providers
export {
  BraveSearchProvider,
  SerperSearchProvider,
} from "./services/search";

// Scheduling
export { calculateNextRunAt } from "./utils/scheduling";

// Email
export { sendReportEmail } from "./services/email";
