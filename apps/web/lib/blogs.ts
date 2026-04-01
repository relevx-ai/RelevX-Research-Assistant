import type { BlogPost, FetchBlogsResponse } from "core";
import { relevx_api } from "./client";

/** Client-only: one successful fetch per tab until full reload or {@link resetBlogsSessionCache}. */
let sessionBlogs: BlogPost[] | null = null;
let sessionInflight: Promise<BlogPost[]> | null = null;

export function resetBlogsSessionCache(): void {
  sessionBlogs = null;
  sessionInflight = null;
}

/**
 * Returns all blogs from a single in-tab request; reuses the same promise/result for the session.
 */
export function getBlogsSessionOnce(): Promise<BlogPost[]> {
  if (sessionBlogs !== null) {
    return Promise.resolve(sessionBlogs);
  }
  if (sessionInflight) {
    return sessionInflight;
  }
  sessionInflight = fetchBlogs()
    .then((data) => {
      sessionBlogs = data;
      sessionInflight = null;
      return data;
    })
    .catch((err) => {
      sessionInflight = null;
      throw err;
    });
  return sessionInflight;
}

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
