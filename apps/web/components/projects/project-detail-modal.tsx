"use client";

import React, { useState } from "react";
import type { ProjectInfo } from "core";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Settings,
  History,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
} from "lucide-react";
import { useDeliveryLogs } from "@/hooks/use-delivery-logs";
import { ProjectDialog } from "./project-dialog";
import ReactMarkdown from "react-markdown";
import {
  DAY_OF_WEEK_LABELS,
  formatDayOfMonth,
  formatRelativeTime,
} from "@/lib/utils";
import { exportAsMarkdown } from "@/lib/export-utils";
import { parseReferencesFromMarkdown } from "@/lib/markdown-utils";

const formatDate = (
  timestamp: number | undefined,
  timezone?: string,
  isPaused?: boolean
) => {
  if (!timestamp) {
    return isPaused ? "Paused - will run when activated" : "Not scheduled";
  }
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export type TabId = "overview" | "history";

interface ProjectDetailModalProps {
  project: ProjectInfo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: TabId;
}

export function ProjectDetailModal({
  project,
  open,
  onOpenChange,
  initialTab,
}: ProjectDetailModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "overview");
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  /* New state for error dialog */
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: "",
    message: "",
  });

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: "history",
      label: "Delivery History",
      icon: <History className="w-4 h-4" />,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[85vh] p-0 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold truncate">
                  {project.title}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  {project.status === "active" ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500 font-medium">
                        Active
                      </span>
                    </>
                  ) : (
                    <>
                      <Circle className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">
                        Paused
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-border/50 px-3 sm:px-6">
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 rounded-t-lg transition-all duration-200 whitespace-nowrap ${
                    activeTab === tab.id
                      ? "border-teal-500 text-teal-400 bg-teal-500/5"
                      : "border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {tab.icon}
                  <span className="hidden xs:inline sm:inline">
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-all duration-300 hover:rotate-90"
              onClick={() => {
                if (project.status === "running") {
                  setErrorDialog({
                    open: true,
                    title: "Edit Restricted",
                    message:
                      "The project is currently being processed, edit is not allowed while a research is in progress.",
                  });
                  return;
                }
                setSettingsDialogOpen(true);
              }}
              title="Project settings"
            >
              <Settings className="w-4 h-4" />
              <span className="sr-only">Project settings</span>
            </Button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === "overview" && <OverviewTab project={project} />}

            {activeTab === "history" && (
              <DeliveryHistoryTab project={project} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <ProjectDialog
        project={project}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      {/* Error Dialog */}
      <Dialog
        open={errorDialog.open}
        onOpenChange={(open: boolean) =>
          setErrorDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDialog.title}</DialogTitle>
            <DialogDescription>{errorDialog.message}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() =>
                setErrorDialog((prev) => ({ ...prev, open: false }))
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Overview Tab Component
function OverviewTab({ project }: { project: ProjectInfo }) {
  const frequencyLabels: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    once: "Once",
  };

  const getFrequencyDisplay = () => {
    if (project.frequency === "once") return "Once";
    const baseLabel = frequencyLabels[project.frequency];
    if (project.frequency === "weekly" && project.dayOfWeek !== undefined) {
      return `${baseLabel} (${DAY_OF_WEEK_LABELS[project.dayOfWeek]})`;
    }
    if (project.frequency === "monthly" && project.dayOfMonth !== undefined) {
      return `${baseLabel} (${formatDayOfMonth(project.dayOfMonth)})`;
    }
    return baseLabel ?? project.frequency;
  };

  const formatTime12Hour = (time24: string) => {
    const [hours, minutes] = time24.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
  };

  const formatTimezone = (tz: string) => {
    // Convert IANA timezone to a more readable format
    // e.g., "America/New_York" -> "EST" or "EDT" based on current date
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        timeZoneName: "short",
      });
      const parts = formatter.formatToParts(new Date());
      const tzPart = parts.find((p) => p.type === "timeZoneName");
      return tzPart?.value || tz;
    } catch {
      return tz;
    }
  };

  return (
    <div className="space-y-8">
      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3">
          Research Topic
        </h3>
        <div className="p-4 rounded-lg border border-border/50 bg-muted/20">
          <p className="text-foreground/80 leading-relaxed whitespace-pre-line">
            {project.description}
          </p>
        </div>
      </div>

      {/* Schedule Settings */}
      <div>
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide mb-3">
          Schedule Settings
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-muted-foreground">Frequency</span>
            </div>
            <p className="font-semibold text-foreground">
              {getFrequencyDisplay()}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-muted-foreground">
                Delivery Time
              </span>
            </div>
            <p className="font-semibold text-foreground">
              {project.deliveryTime
                ? `${formatTime12Hour(project.deliveryTime)} ${formatTimezone(
                    project.timezone
                  )}`
                : "Not set"}
            </p>
          </div>

          <div className="p-4 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span className="text-xs text-muted-foreground">Next Run</span>
            </div>
            <p
              className={`font-semibold text-sm ${
                project.status === "paused"
                  ? "text-amber-400"
                  : "text-foreground"
              }`}
            >
              {formatDate(
                project.nextRunAt,
                project.timezone,
                project.status === "paused"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Created/Updated Info */}
      <div className="pt-4 border-t border-border/30">
        <div className="flex items-center gap-6 text-sm">
          <div
            className="flex items-center gap-2"
            title={new Date(project.createdAt).toLocaleString()}
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Created:</span>
            <span className="text-foreground/80">
              {formatRelativeTime(project.createdAt)}
            </span>
          </div>
          {project.updatedAt && (
            <div
              className="flex items-center gap-2"
              title={new Date(project.updatedAt).toLocaleString()}
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Last updated:</span>
              <span className="text-foreground/80">
                {formatRelativeTime(project.updatedAt)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Delivery History Tab Component
function DeliveryHistoryTab({ project }: { project: ProjectInfo }) {
  const { logs, loading, error, pagination, page, goToNextPage, goToPrevPage } =
    useDeliveryLogs(project.title);
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedLogIndex(expandedLogIndex === index ? null : index);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case "partial":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Circle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "Delivered";
      case "failed":
        return "Failed";
      case "partial":
        return "Partial";
      case "pending":
        return "Pending";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">No Delivery History</h3>
        <p className="text-muted-foreground">
          This project hasn&apos;t completed any research runs yet.
          <br />
          Results will appear here after the first scheduled run.
        </p>
      </div>
    );
  }

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground/70 uppercase tracking-wide">
          Past Deliveries
        </h3>
        <span className="text-sm text-muted-foreground">
          {pagination
            ? `${pagination.total} total`
            : `${logs.length} deliveries`}
        </span>
      </div>

      <div className="space-y-3">
        {logs.map((log, index) => (
          <div
            key={index}
            className="border border-border/50 rounded-lg"
          >
            {/* Log Header */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => toggleExpand(index)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleExpand(index);
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {getStatusIcon(log.status)}
                <div>
                  <p className="font-medium">{log.reportTitle}</p>
                  <p className="text-sm text-muted-foreground">
                    {log.status === "pending"
                      ? formatDate(project.nextRunAt, project.timezone)
                      : formatDate(log.deliveredAt, log.timezone)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    log.status === "success"
                      ? "bg-green-500/10 text-green-500"
                      : log.status === "failed"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {getStatusLabel(log.status)}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportAsMarkdown(log);
                  }}
                  className="p-1.5 rounded-md hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4" />
                </button>
                {expandedLogIndex === index ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Expanded Content */}
            {expandedLogIndex === index && (
              <div className="border-t border-border/50 bg-muted/20">
                {/* Error Message */}
                {log.error && (
                  <div className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{log.error}</p>
                  </div>
                )}

                {/* Summary */}
                {log.reportSummary && (
                  <div className="mx-4 mt-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Summary
                    </p>
                    <p className="mt-2 text-sm text-foreground/80 leading-6">
                      {log.reportSummary}
                    </p>
                  </div>
                )}

                {/* Report Content */}
                {log.reportMarkdown && (
                  <div className="report-content max-h-[500px] overflow-y-auto p-6">
                    <div className="max-w-3xl">
                      <ReactMarkdown
                        components={{
                          h1: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <h1 className="text-2xl font-bold text-foreground mb-6 leading-tight">
                              {children}
                            </h1>
                          ),
                          h2: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <h2 className="text-xl font-bold text-foreground mt-10 mb-4 pb-2 border-b border-teal-500/30">
                              {children}
                            </h2>
                          ),
                          h3: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">
                              {children}
                            </h3>
                          ),
                          p: ({ children }: { children?: React.ReactNode }) => (
                            <p className="text-base text-foreground/80 leading-7 mb-6">
                              {children}
                            </p>
                          ),
                          a: ({
                            href,
                            children,
                          }: {
                            href?: string;
                            children?: React.ReactNode;
                          }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 border-b border-cyan-400/30 hover:border-cyan-300 transition-colors"
                            >
                              {children}
                            </a>
                          ),
                          ul: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <ul className="mb-6 space-y-3 text-foreground/80">
                              {children}
                            </ul>
                          ),
                          ol: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <ol className="mb-6 pl-6 space-y-3 text-foreground/80 list-decimal marker:text-teal-400">
                              {children}
                            </ol>
                          ),
                          li: ({
                            children,
                            ...props
                          }: {
                            children?: React.ReactNode;
                            ordered?: boolean;
                          }) => {
                            // Check if parent is ol (ordered) by checking if there's an index prop
                            const isOrdered = props.ordered;
                            if (isOrdered) {
                              return (
                                <li className="text-base leading-7 pl-2">
                                  {children}
                                </li>
                              );
                            }
                            return (
                              <li className="text-base leading-7 flex gap-3">
                                <span className="text-teal-400 mt-0.5 shrink-0">
                                  •
                                </span>
                                <span>{children}</span>
                              </li>
                            );
                          },
                          strong: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <strong className="text-foreground font-semibold">
                              {children}
                            </strong>
                          ),
                          em: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <em className="text-foreground/90 bg-teal-500/10 px-1 rounded not-italic">
                              {children}
                            </em>
                          ),
                          blockquote: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <blockquote className="my-6 py-4 px-5 bg-muted/50 border-l-4 border-teal-500 rounded-r-lg text-foreground/70">
                              {children}
                            </blockquote>
                          ),
                          code: ({
                            children,
                            className,
                          }: {
                            children?: React.ReactNode;
                            className?: string;
                          }) => {
                            const isInline = !className;
                            return isInline ? (
                              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground">
                                {children}
                              </code>
                            ) : (
                              <code className="text-sm font-mono text-teal-200">
                                {children}
                              </code>
                            );
                          },
                          pre: ({
                            children,
                          }: {
                            children?: React.ReactNode;
                          }) => (
                            <pre className="bg-background/80 border border-border/50 p-5 rounded-lg overflow-x-auto my-6">
                              {children}
                            </pre>
                          ),
                          hr: () => (
                            <hr className="my-8 border-none h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
                          ),
                        }}
                      >
                        {log.reportMarkdown}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}

                {/* Sources */}
                {log.reportMarkdown &&
                  (() => {
                    const refs = parseReferencesFromMarkdown(
                      log.reportMarkdown
                    );
                    if (refs.length === 0) return null;
                    return (
                      <div className="mx-4 mt-4 rounded-lg border border-border/50 bg-muted/30 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                          Sources
                        </p>
                        <ol className="space-y-2">
                          {refs.map((ref) => (
                            <li
                              key={ref.number}
                              className="flex items-start gap-2 text-sm"
                            >
                              <span className="text-muted-foreground shrink-0 w-5 text-right">
                                {ref.number}.
                              </span>
                              <div className="min-w-0">
                                <a
                                  href={ref.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1"
                                >
                                  <span className="truncate">{ref.name}</span>
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                                {ref.date && (
                                  <span className="text-muted-foreground text-xs ml-2">
                                    {ref.date}
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    );
                  })()}

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-4 text-sm p-4 pt-0 border-t border-border/30 mt-4">
                  <div className="pt-4">
                    <span className="text-muted-foreground">
                      {log.status === "pending"
                        ? "Scheduled For:"
                        : "Delivered At:"}
                    </span>
                    <p>
                      {log.status === "pending"
                        ? formatDate(project.nextRunAt, project.timezone)
                        : formatDate(log.deliveredAt, log.timezone)}
                    </p>
                  </div>
                  {log.retryCount > 0 && (
                    <div>
                      <span className="text-muted-foreground">
                        Retry Attempts:
                      </span>
                      <p>{log.retryCount}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPrevPage}
            disabled={page === 0}
            className="flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextPage}
            disabled={!pagination.hasMore}
            className="flex items-center gap-1"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
