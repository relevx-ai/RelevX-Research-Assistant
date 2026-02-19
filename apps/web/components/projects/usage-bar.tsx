"use client";

import { FolderOpen, Zap } from "lucide-react";

interface UsageBarProps {
  activeProjectCount: number;
  maxActiveProjects: number;
  oneShotRunsUsed: number;
  oneShotRunsLimit: number;
  loading: boolean;
}

export function UsageBar({
  activeProjectCount,
  maxActiveProjects,
  oneShotRunsUsed,
  oneShotRunsLimit,
  loading,
}: UsageBarProps) {
  const oneShotRemaining = Math.max(0, oneShotRunsLimit - oneShotRunsUsed);

  if (loading) {
    return (
      <div className="glass-card border border-teal-500/10 rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted/40 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-muted/40 animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted/40 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card border border-teal-500/10 rounded-xl p-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
        <div className="flex items-center gap-2 text-sm">
          <FolderOpen className="w-4 h-4 text-teal-400" />
          <span className="text-muted-foreground">Active Projects</span>
          <span className="font-semibold text-foreground">
            {activeProjectCount}/{maxActiveProjects}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Zap className="w-4 h-4 text-teal-400" />
          <span className="text-muted-foreground">Run Now</span>
          <span className="font-semibold text-foreground">
            {oneShotRemaining}/{oneShotRunsLimit} remaining
          </span>
        </div>
      </div>
    </div>
  );
}
