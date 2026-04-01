import type { BlogPost, FetchBlogsResponse } from "core";
import { relevx_api } from "./client";
import { functionsBaseUrl } from "./functions-proxy";

function postTimestamp(post: BlogPost): number {
  if (!post.publishedAt) return 0;
  const t = Date.parse(post.publishedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Pinned posts first (recommended: a single pinned item), then newest → oldest by publishedAt.
 */
export function sortBlogPostsForListing(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((a, b) => {
    const aPin = a.pinned === true ? 1 : 0;
    const bPin = b.pinned === true ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;
    return postTimestamp(b) - postTimestamp(a);
  });
}

/**
 * Client fetch (uses Firebase token when present; /blogs is allowlisted on the API).
 */
export async function fetchBlogs(): Promise<BlogPost[]> {
  const response = await relevx_api.get<FetchBlogsResponse>(
    "/api/v1/products/blogs"
  );

  if (!response.ok) {
    throw new Error("Failed to fetch blogs");
  }

  return sortBlogPostsForListing(response.blogs ?? []);
}

/**
 * Server-side fetch for RSC (no Authorization header; public route).
 */
export async function fetchBlogsServer(): Promise<BlogPost[]> {
  const url = `${functionsBaseUrl()}/api/v1/products/blogs`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Failed to fetch blogs");
  }
  const data = (await res.json()) as FetchBlogsResponse;
  return data.blogs ?? [];
}
