/**
 * Blog post as loaded from Firebase Remote Config "blogs" JSON array.
 * Each item: slug (URL segment), title, optional excerpt, html body, optional date.
 * Set pinned: true on at most one post to keep it above the chronologically sorted list.
 */
export interface BlogPost {
  slug: string;
  title: string;
  publishedAt?: string;
  excerpt?: string;
  html: string;
  /** When true, listed above all unpinned posts (newest-first still applies among pinned if several). */
  pinned?: boolean;
  /** SEO meta description (recommended ~150–160 characters). */
  metaDescription?: string;
}

export interface FetchBlogsResponse {
  ok: boolean;
  blogs: BlogPost[];
}
