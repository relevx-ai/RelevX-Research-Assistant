/**
 * Strips the References section and inline markdown links from report markdown
 * so that the email version contains no external URLs (avoiding spam-filter triggers).
 *
 * The full markdown (with references) is still stored in Firestore; this function
 * is applied only before rendering the email HTML.
 */
export function stripReferencesForEmail(markdown: string): string {
  // 1. Remove the ## References section and everything after it
  //    Matches "## References" (with optional leading whitespace) through end of string
  let cleaned = markdown.replace(/^\s*##\s+References[\s\S]*$/im, "").trimEnd();

  // 2. Convert remaining markdown links [text](url) to just "text"
  //    but leave bare citation markers like [1], [2], [3] untouched
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  return cleaned;
}
