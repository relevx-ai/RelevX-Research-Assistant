import Link from "next/link";
import { Home, ChevronRight } from "lucide-react";

export default function BlogPostNotFound() {
  return (
    <div className="container py-6 sm:py-8 px-4 sm:px-6 max-w-3xl mx-auto">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 sm:mb-8"
      >
        <Link
          href="/"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <Link href="/blogs" className="hover:text-foreground transition-colors">
          Blog
        </Link>
      </nav>
      <h1 className="text-2xl font-bold mb-2">Post not found</h1>
      <p className="text-muted-foreground text-sm mb-6">
        This article does not exist or may have been removed.
      </p>
      <Link
        href="/blogs"
        className="text-sm font-medium text-teal-400 hover:text-teal-300"
      >
        ← Back to blog
      </Link>
    </div>
  );
}
