"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { BlogsSessionProvider } from "@/components/blogs/blogs-session-provider";

const blogIndexTitle = "Blog | RelevX — AI Research & Inbox Insights";
const blogIndexDescription =
  "Learn how teams use RelevX for automated research, curated briefs, and inbox delivery. Tips for competitive intel, monitoring, and staying informed without the tab overload.";

export default function BlogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/blogs") return;
    document.title = blogIndexTitle;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", blogIndexDescription);
  }, [pathname]);

  return <BlogsSessionProvider>{children}</BlogsSessionProvider>;
}
