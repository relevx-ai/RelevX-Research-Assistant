import type { MetadataRoute } from "next";
import type { FetchBlogsResponse } from "core";
import { functionsBaseUrl } from "@/lib/functions-proxy";
import { canonicalSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = canonicalSiteUrl();
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/pricing`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/blogs`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.85,
    },
  ];

  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const apiBase = functionsBaseUrl();
    const res = await fetch(`${apiBase}/api/v1/products/blogs`, {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = (await res.json()) as FetchBlogsResponse;
      for (const post of data.blogs ?? []) {
        if (!post.slug) continue;
        const lastMod = post.publishedAt
          ? new Date(post.publishedAt)
          : new Date();
        blogEntries.push({
          url: `${base}/blogs/${post.slug}`,
          lastModified: Number.isFinite(lastMod.getTime())
            ? lastMod
            : new Date(),
          changeFrequency: "monthly",
          priority: 0.7,
        });
      }
    }
  } catch {
    // Build/deploy should still succeed if the API is unreachable.
  }

  return [...staticEntries, ...blogEntries];
}
