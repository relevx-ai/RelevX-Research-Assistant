/**
 * useBlogs web hook — same pattern as usePlans for client components.
 */

import { useState, useEffect } from "react";
import { getBlogsSessionOnce } from "@/lib/blogs";
import type { BlogPost } from "core";

interface UseBlogsResult {
  blogs: BlogPost[];
  loading: boolean;
  error: string | null;
}

export function useBlogs(): UseBlogsResult {
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await getBlogsSessionOnce();
        setBlogs(list);
      } catch (err) {
        console.error("Error fetching blogs:", err);
        setError("Failed to fetch blogs");
        setBlogs([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return { blogs, loading, error };
}
