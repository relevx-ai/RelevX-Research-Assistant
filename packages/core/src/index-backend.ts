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
  TopDownPlanMetrics,
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
  updateActiveProjectCount,
  recordRunMetrics,
  getActiveProjectsByFrequency,
} from "./utils/analytics";

export type { PlanType, RecurringFrequency } from "./utils/analytics";

export type {
  ImproveProjectDescriptionRequest,
  ImproveProjectDescriptionResponse,
  ValidateProjectDescriptionResult,
} from "./models/ai";

export { validateProjectDescription } from "./services/project-description-validation";

export { initializeOpenRouter, getClient, translateText, translateShortText } from "./services/llm";

export {
  sanitizeLanguageCode,
  sanitizeRegionCode,
} from "./utils/language-validation";

// Firebase (server-side only)
export { db } from "./services/firebase";

// Research engine
export {
  executeResearchForProject,
  setDefaultSearchProvider,
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

export { stripReferencesForEmail } from "./utils/markdown-references";
