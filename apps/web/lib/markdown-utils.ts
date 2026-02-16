export interface ParsedReference {
  number: number;
  name: string;
  url: string;
  date?: string;
}

/**
 * Extracts structured references from the ## References section of report markdown.
 *
 * Expected formats:
 *   1. [Source Name](https://...) - Jan 15, 2025
 *   1. [Source Name](https://...)
 *   - [Source Name](https://...) - Jan 15, 2025
 */
export function parseReferencesFromMarkdown(
  markdown: string
): ParsedReference[] {
  // Find the ## References section
  const refMatch = markdown.match(/^##\s+References\s*$/im);
  if (!refMatch || refMatch.index === undefined) return [];

  const referencesSection = markdown.slice(refMatch.index + refMatch[0].length);

  // Stop at the next ## heading (if any)
  const nextHeading = referencesSection.match(/^##\s+/m);
  const sectionText = nextHeading?.index
    ? referencesSection.slice(0, nextHeading.index)
    : referencesSection;

  const references: ParsedReference[] = [];

  // Match numbered or bulleted list items containing markdown links
  // e.g. "1. [Name](url) - Date" or "- [Name](url)"
  const linePattern =
    /(?:^|\n)\s*(?:(\d+)[.)]\s*|-\s*)\[([^\]]+)\]\(([^)]+)\)(?:\s*[-–—]\s*(.+?))?(?=\n|$)/g;

  let match: RegExpExecArray | null;
  let autoNumber = 1;

  while ((match = linePattern.exec(sectionText)) !== null) {
    const number = match[1] ? parseInt(match[1], 10) : autoNumber;
    references.push({
      number,
      name: match[2].trim(),
      url: match[3].trim(),
      date: match[4]?.trim() || undefined,
    });
    autoNumber = number + 1;
  }

  return references;
}
