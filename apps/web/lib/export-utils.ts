import type { RelevxDeliveryLog } from "core/models/delivery-log";

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").trim();
}

function formatDateForReport(timestamp?: number, timezone?: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Export a single delivery log as a Markdown file.
 */
export function exportAsMarkdown(log: RelevxDeliveryLog) {
  const date = formatDateForReport(log.deliveredAt, log.timezone);
  const frontmatter = [
    "---",
    `title: "${log.reportTitle}"`,
    date ? `date: "${date}"` : null,
    log.reportSummary ? `summary: "${log.reportSummary.replace(/"/g, '\\"')}"` : null,
    "---",
  ]
    .filter(Boolean)
    .join("\n");

  const content = `${frontmatter}\n\n# ${log.reportTitle}\n\n${log.reportMarkdown || "_(No report content)_"}`;
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const filename = `RelevX - ${sanitizeFilename(log.reportTitle)}.md`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
