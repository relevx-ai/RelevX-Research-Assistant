/**
 * Language and region code validation
 *
 * Whitelist of supported language/region codes to prevent prompt injection
 * via user-controlled language parameters that are interpolated into LLM prompts.
 */

/** Valid ISO 639-1 / BCP 47 language codes accepted by the platform */
export const VALID_LANGUAGE_CODES = new Set([
  'en', 'es', 'de', 'fr', 'jp', 'zh-hans', 'zh-hant',
  'ar', 'pt-br', 'pt-pt', 'ru', 'ko', 'it', 'nl',
]);

/** Valid ISO 3166-1 alpha-2 region codes accepted by the platform */
export const VALID_REGION_CODES = new Set([
  'US', 'GB', 'DE', 'FR', 'JP', 'CN', 'ES', 'IT', 'CA', 'AU', 'IN', 'BR',
]);

/**
 * Validate a language code against the whitelist.
 * Returns the code if valid, or undefined if invalid.
 */
export function sanitizeLanguageCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return VALID_LANGUAGE_CODES.has(code) ? code : undefined;
}

/**
 * Validate a region code against the whitelist.
 * Returns the code if valid, or undefined if invalid.
 */
export function sanitizeRegionCode(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return VALID_REGION_CODES.has(code) ? code : undefined;
}
