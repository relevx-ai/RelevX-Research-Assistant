import Link from "next/link";
import type { Metadata } from "next";
import { Home, ChevronRight } from "lucide-react";
import { fetchBlogsServer, sortBlogPostsForListing } from "@/lib/blogs";

export const metadata: Metadata = {
  title: "Blog | RelevX — AI Research & Inbox Insights",
  description:
    "Learn how teams use RelevX for automated research, curated briefs, and inbox delivery. Tips for competitive intel, monitoring, and staying informed without the tab overload.",
  openGraph: {
    title: "RelevX Blog — AI-Powered Research Assistant",
    description:
      "Guides and ideas for set-and-forget research, source-quality filtering, and insights delivered to your inbox.",
    siteName: "RelevX",
  },
};

export default async function BlogsPage() {
  let blogs: Awaited<ReturnType<typeof fetchBlogsServer>> = [];
  let loadError: string | null = null;
  try {
    blogs = await fetchBlogsServer();
  } catch {
    loadError = "We could not load posts right now. Please try again later.";
  }

  const sorted = sortBlogPostsForListing(blogs);

  return (
    <div className="container py-6 sm:py-8 px-4 sm:px-6 max-w-3xl mx-auto">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 sm:mb-8"
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <span className="text-foreground font-medium">Blog</span>
      </nav>

      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
          <span className="gradient-text">RelevX</span> Blog
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground/80">
          Guides for automated research, competitive intel, and inbox-ready
          briefs—plus how teams use RelevX to stay informed without the tab
          overload. Open a post for the full article.
        </p>
      </div>

      {loadError ? (
        <p className="text-center text-destructive text-sm">{loadError}</p>
      ) : sorted.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm">
          No posts yet. Check back soon.
        </p>
      ) : (
        <ul className="flex flex-col gap-4 sm:gap-5 list-none p-0 m-0">
          {sorted.map((post) => (
            <li key={post.slug}>
              <Link href={`/blogs/${post.slug}`} className="block group">
                <div className="rounded-xl border border-border/50 bg-muted/10 p-5 sm:p-6 transition-all duration-300 group-hover:border-teal-500/30 group-hover:bg-muted/20 group-hover:shadow-glow-sm">
                  <div className="pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg sm:text-xl font-semibold group-hover:text-teal-300 transition-colors">
                        {post.title}
                      </h2>
                      {post.pinned === true ? (
                        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/25">
                          Pinned
                        </span>
                      ) : null}
                    </div>
                    {post.publishedAt ? (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Published {post.publishedAt}
                      </p>
                    ) : null}
                  </div>
                  {post.excerpt ? (
                    <div
                      className="text-sm text-muted-foreground leading-relaxed line-clamp-3 [&_a]:text-teal-400 [&_a]:underline pt-0"
                      dangerouslySetInnerHTML={{ __html: post.excerpt }}
                    />
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
