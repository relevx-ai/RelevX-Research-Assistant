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
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 3. Remove bare citation markers like [1], [12], [3][1]
  //    Must run after link stripping to avoid conflicts with markdown links
  cleaned = cleaned.replace(/\[\d+\]/g, "");

  // 4. Clean up double-spaces left behind by removed citations
  cleaned = cleaned.replace(/ {2,}/g, " ");

  return cleaned;
}
