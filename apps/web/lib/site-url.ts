/**
 * Canonical public origin for SEO (sitemap, robots, future metadata).
 * Set NEXT_PUBLIC_SITE_URL in Vercel (e.g. https://relevx.ai) so previews use the right host.
 */
export function canonicalSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "https://relevx.ai";
}
