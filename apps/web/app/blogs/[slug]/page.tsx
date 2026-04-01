import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Home, ChevronRight } from "lucide-react";
import { fetchBlogsServer } from "@/lib/blogs";

function descriptionForPost(post: {
  metaDescription?: string;
  excerpt?: string;
}): string | undefined {
  if (post.metaDescription?.trim()) return post.metaDescription.trim();
  if (!post.excerpt?.trim()) return undefined;
  const plain = post.excerpt.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return undefined;
  return plain.length > 160 ? `${plain.slice(0, 157)}…` : plain;
}

const htmlShellClass =
  "blog-html text-foreground max-w-none " +
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-6 [&_h1]:first:mt-0 " +
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:mt-5 " +
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_h3]:mt-4 " +
  "[&_p]:mb-4 [&_p]:text-muted-foreground [&_p]:leading-relaxed " +
  "[&_a]:text-teal-400 [&_a]:underline hover:[&_a]:text-teal-300 " +
  "[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ul]:text-muted-foreground " +
  "[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_ol]:text-muted-foreground " +
  "[&_li]:mb-1 [&_blockquote]:border-l-2 [&_blockquote]:border-teal-500/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground " +
  "[&_code]:text-sm [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_pre]:bg-muted/30 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const blogs = await fetchBlogsServer();
    const post = blogs.find((b) => b.slug === slug);
    if (!post) return { title: "Post not found — RelevX" };
    const description = descriptionForPost(post);
    const title = `${post.title} | RelevX Blog`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "article",
        siteName: "RelevX",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
      },
    };
  } catch {
    return { title: "Blog — RelevX" };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  let blogs: Awaited<ReturnType<typeof fetchBlogsServer>> = [];
  try {
    blogs = await fetchBlogsServer();
  } catch {
    throw new Error("Failed to fetch blogs");
  }

  const post = blogs.find((b) => b.slug === slug);
  if (!post) notFound();

  return (
    <div className="container py-6 sm:py-8 px-4 sm:px-6 max-w-3xl mx-auto">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 sm:mb-8 flex-wrap"
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        <Link
          href="/blogs"
          className="hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
        >
          Blog
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
        <span className="text-foreground font-medium truncate max-w-[12rem] sm:max-w-md">
          {post.title}
        </span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {post.title}
          </h1>
          {post.pinned === true ? (
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-400 border border-teal-500/25">
              Pinned
            </span>
          ) : null}
        </div>
        {post.publishedAt ? (
          <p className="text-sm text-muted-foreground">
            Published {post.publishedAt}
          </p>
        ) : null}
      </header>

      <article
        className={htmlShellClass}
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <aside
        className="mt-10 rounded-xl border border-teal-500/20 bg-teal-500/5 p-6 sm:p-8"
        aria-label="Get started with RelevX"
      >
        <h2 className="text-lg font-semibold text-foreground mb-2">
          Try RelevX on your topics
        </h2>
        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          Set up recurring research, get curated summaries with citations, and
          stop living in dozens of open tabs. Start free or pick a plan that
          matches how many projects you run.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-teal-600 to-teal-500 px-4 py-2.5 text-sm font-medium text-white shadow-glow-sm hover:from-teal-500 hover:to-teal-400 transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-lg border border-border bg-background/80 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            View pricing
          </Link>
        </div>
      </aside>

      <p className="mt-10 pt-8 border-t border-border/50">
        <Link
          href="/blogs"
          className="text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors"
        >
          ← All posts
        </Link>
      </p>
    </div>
  );
}
