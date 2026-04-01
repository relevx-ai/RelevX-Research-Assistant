"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { BlogPost } from "core";
import {
  getBlogsSessionOnce,
  resetBlogsSessionCache,
  sortBlogPostsForListing,
} from "@/lib/blogs";

type BlogsSessionValue = {
  blogs: BlogPost[];
  sortedBlogs: BlogPost[];
  loading: boolean;
  error: string | null;
  reload: () => void;
};

const BlogsSessionContext = createContext<BlogsSessionValue | undefined>(
  undefined
);

export function BlogsSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const reload = useCallback(() => {
    resetBlogsSessionCache();
    setReloadTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getBlogsSessionOnce()
      .then((list) => {
        if (!cancelled) {
          setBlogs(list);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("We could not load posts right now. Please try again later.");
          setBlogs([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const value = useMemo<BlogsSessionValue>(
    () => ({
      blogs,
      sortedBlogs: sortBlogPostsForListing(blogs),
      loading,
      error,
      reload,
    }),
    [blogs, loading, error, reload]
  );

  return (
    <BlogsSessionContext.Provider value={value}>
      {children}
    </BlogsSessionContext.Provider>
  );
}

export function useBlogsSession(): BlogsSessionValue {
  const ctx = useContext(BlogsSessionContext);
  if (ctx === undefined) {
    throw new Error("useBlogsSession must be used within BlogsSessionProvider");
  }
  return ctx;
}
