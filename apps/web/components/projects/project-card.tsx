"use client";

import React, { useState } from "react";
import { useProjects } from "@/hooks/use-projects";
import type { ProjectInfo } from "core";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  MoreVertical,
  Settings,
  Trash2,
  Clock,
  Calendar,
  AlertCircle,
  ArrowRight,
  Play,
  Copy,
  Info,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { ProjectDialog } from "./project-dialog";
import { ProjectDetailModal } from "./project-detail-modal";
import {
  DAY_OF_WEEK_LABELS,
  formatDayOfMonth,
  formatRelativeTime,
} from "@/lib/utils";
import Link from "next/link";

interface ProjectCardProps {
  project: ProjectInfo;
  allProjects?: ProjectInfo[];
  onProjectDeleted?: () => void;
  onProjectDuplicated?: () => void;
}

export function ProjectCard({ project, allProjects = [], onProjectDeleted, onProjectDuplicated }: ProjectCardProps) {
  const { toggleProjectStatus, deleteProject, runProjectNow, createProject } = useProjects({
    subscribe: false,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isRunningNow, setIsRunningNow] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);
  const [duplicatedTitle, setDuplicatedTitle] = useState("");
  const [pausedInfoDialogOpen, setPausedInfoDialogOpen] = useState(false);
  const [maxActiveProjects, setMaxActiveProjects] = useState(1);
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    type?: "generic" | "max_active_projects";
  }>({
    open: false,
    title: "",
    message: "",
    type: "generic",
  });

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

  const handleToggleActive = async () => {
    setIsToggling(true);
    try {
      const newStatus = project.status === "active" ? "paused" : "active";
      if (newStatus !== project.status) {
        await toggleProjectStatus(project.title, newStatus);
      }
    } catch (err: any) {
      // Check if it's a ProjectError with custom code
      if (err.errorCode === "max_active_projects") {
        // This is an expected limit, show a helpful dialog without logging error
        setErrorDialog({
          open: true,
          title: "Active Project Limit Reached",
          message:
            err.errorMessage ||
            "You have reached the maximum number of active projects on your current plan.",
          type: "max_active_projects",
        });
      } else if (err.errorCode) {
        // Other known errors
        console.error("Failed to toggle project status:", err);
        setErrorDialog({
          open: true,
          title: "Action Failed",
          message: err.errorMessage || "An unexpected error occurred.",
          type: "generic",
        });
      } else {
        // Unknown errors
        console.error("Failed to toggle project status:", err);
        setErrorDialog({
          open: true,
          title: "Action Failed",
          message: "An unexpected error occurred. Please try again.",
          type: "generic",
        });
      }
    } finally {
      setIsToggling(false);
    }
  };

  const generateUniqueTitle = (baseTitle: string): string => {
    const existingTitles = new Set(allProjects.map((p) => p.title.toLowerCase()));
    const copyTitle = `${baseTitle} (Copy)`;
    if (!existingTitles.has(copyTitle.toLowerCase())) return copyTitle;

    let counter = 2;
    while (existingTitles.has(`${baseTitle} (Copy ${counter})`.toLowerCase())) {
      counter++;
    }
    return `${baseTitle} (Copy ${counter})`;
  };

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    setDuplicateSuccess(false);
    setDuplicateDialogOpen(true);
    try {
      const newTitle = generateUniqueTitle(project.title);
      setDuplicatedTitle(newTitle);
      const duplicateData: any = {
        title: newTitle,
        description: project.description,
        frequency: project.frequency,
        resultsDestination: "email",
        deliveryTime: project.deliveryTime || "09:00",
        timezone: project.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        settings: project.settings || {
          relevancyThreshold: 60,
          minResults: 5,
          maxResults: 20,
        },
      };

      if (project.frequency === "weekly" && project.dayOfWeek !== undefined) {
        duplicateData.dayOfWeek = project.dayOfWeek;
      }
      if (project.frequency === "monthly" && project.dayOfMonth !== undefined) {
        duplicateData.dayOfMonth = project.dayOfMonth;
      }

      if (project.searchParameters && Object.keys(project.searchParameters).length > 0) {
        duplicateData.searchParameters = { ...project.searchParameters };
      }

      const response = await createProject(duplicateData);
      setDuplicateSuccess(true);
      onProjectDuplicated?.();

      // Auto-close the success dialog after a brief moment
      setTimeout(() => {
        setDuplicateDialogOpen(false);
        setDuplicateSuccess(false);

        if (response?.createdAsPaused) {
          setMaxActiveProjects(response.maxActiveProjects || 1);
          setPausedInfoDialogOpen(true);
        }
      }, 1200);
    } catch (err: any) {
      console.error("Failed to duplicate project:", err);
      setDuplicateDialogOpen(false);
      setDuplicateSuccess(false);
      setErrorDialog({
        open: true,
        title: "Duplicate Failed",
        message: err?.message || "Failed to duplicate project. Please try again.",
        type: "generic",
      });
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't open modal if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest('[role="switch"]') ||
      target.closest('[role="menu"]') ||
      target.closest("[data-radix-collection-item]")
    ) {
      return;
    }
    setDetailModalOpen(true);
  };

  return (
    <>
      <Card
        className={`group glass-card hover:scale-[1.02] transition-all duration-300 h-full flex flex-col cursor-pointer ${
          project.status === "running"
            ? "!border-teal-500 !border-2 shadow-glow-sm"
            : ""
        }`}
        onClick={handleCardClick}
      >
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                {project.frequency === "once" ? (
                  <div
                    className={`h-4 w-4 shrink-0 rounded-full ${
                      project.status === "active" ||
                      project.status === "running"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                    title={
                      project.status === "active" ||
                      project.status === "running"
                        ? "Active"
                        : "Not active"
                    }
                  />
                ) : (
                  <Switch
                    checked={
                      project.status === "active" ||
                      project.status === "running"
                    }
                    onCheckedChange={handleToggleActive}
                    disabled={isToggling}
                  />
                )}
              </div>
              <CardTitle className="text-lg sm:text-xl mb-1.5 sm:mb-2 line-clamp-2">
                {project.title}
              </CardTitle>
            </div>

            {/* 3-Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  title="Project options"
                >
                  <MoreVertical className="w-4 h-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-card border-teal-500/20"
              >
                <DropdownMenuItem
                  className="gap-2 hover:bg-teal-500/10 focus:bg-teal-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
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
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </DropdownMenuItem>
                {project.status !== "running" && (
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.stopPropagation();
                        setIsRunningNow(true);
                        try {
                          await runProjectNow(project.title);
                        } catch (err: unknown) {
                          const message =
                            err instanceof Error
                              ? err.message
                              : "Run Now failed";
                          setErrorDialog({
                            open: true,
                            title: "Run Now failed",
                            message,
                            type: "generic",
                          });
                        } finally {
                          setIsRunningNow(false);
                        }
                      }}
                      aria-disabled={isRunningNow}
                      className={`gap-2 hover:bg-teal-500/10 focus:bg-teal-500/10${isRunningNow ? " opacity-60 pointer-events-none" : ""}`}
                    >
                      {isRunningNow ? (
                        <Clock className="w-4 h-4 animate-pulse" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Run Now
                    </DropdownMenuItem>
                  )}
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDuplicate();
                  }}
                  aria-disabled={isDuplicating}
                  className={`gap-2 hover:bg-teal-500/10 focus:bg-teal-500/10${isDuplicating ? " opacity-60 pointer-events-none" : ""}`}
                >
                  {isDuplicating ? (
                    <Copy className="w-4 h-4 animate-pulse" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {isDuplicating ? "Duplicating..." : "Duplicate"}
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-teal-500/20" />
                <DropdownMenuItem
                  className="gap-2 text-red-400 focus:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <CardDescription className="line-clamp-2 sm:line-clamp-3 text-sm text-muted-foreground/80 whitespace-pre-line">
            {project.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex-1 px-4 pb-4 sm:px-6 sm:pb-6 pt-0">
          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400/60" />
              <span className="text-muted-foreground/70">Frequency:</span>
              <span className="font-medium">{getFrequencyDisplay()}</span>
            </div>

            {project.deliveryTime && project.timezone && (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-teal-400/60" />
                <span className="text-muted-foreground/70">Time:</span>
                <span className="font-medium">
                  {formatTime12Hour(project.deliveryTime)}{" "}
                  {project.timezone.split("/")[1]?.replace(/_/g, " ") ||
                    project.timezone}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t border-teal-500/10 px-4 py-3 sm:px-6 sm:py-4">
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground/60"
            title={new Date(project.createdAt).toLocaleString()}
          >
            <Calendar className="w-3 h-3" />
            <span>Created {formatRelativeTime(project.createdAt)}</span>
          </div>
        </CardFooter>
      </Card>

      {/* Delete Confirmation Dialog */}
      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onDelete={async (title) => {
          const success = await deleteProject(title);
          if (success) onProjectDeleted?.();
          return success;
        }}
      />

      {/* Edit Settings Dialog */}
      <ProjectDialog
        project={project}
        open={settingsDialogOpen}
        onOpenChange={setSettingsDialogOpen}
      />

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={project}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />

      {/* Generic Error Dialog */}
      <Dialog
        open={errorDialog.open && errorDialog.type === "generic"}
        onOpenChange={(open: boolean) =>
          setErrorDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{errorDialog.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{errorDialog.message}</p>
          <DialogFooter>
            <Button
              onClick={() =>
                setErrorDialog((prev) => ({ ...prev, open: false }))
              }
              className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Progress Dialog */}
      <Dialog
        open={duplicateDialogOpen}
        onOpenChange={(open: boolean) => {
          if (!isDuplicating) setDuplicateDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-[350px]">
          <div className="flex flex-col items-center justify-center py-6 space-y-4">
            {duplicateSuccess ? (
              <>
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Project Duplicated</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    "{duplicatedTitle}" has been created.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-teal-600 dark:text-teal-400 animate-spin" />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-foreground">Duplicating Project</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Creating a copy of "{project.title}"...
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Paused Info Dialog */}
      <Dialog
        open={pausedInfoDialogOpen}
        onOpenChange={setPausedInfoDialogOpen}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                <Info className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <DialogTitle>Project Created as Paused</DialogTitle>
            </div>
          </DialogHeader>

          <div className="text-left space-y-3 text-sm text-muted-foreground">
            <p>
              Your project has been duplicated successfully, but it's currently{" "}
              <span className="font-medium text-foreground">paused</span>{" "}
              because you can only have {maxActiveProjects} active project
              {maxActiveProjects === 1 ? "" : "s"} on your current plan.
            </p>
            <p>To activate this project, you can either:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pause one of your currently active projects</li>
              <li>Upgrade your plan to run more projects simultaneously</li>
            </ul>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPausedInfoDialogOpen(false)}
            >
              Got it
            </Button>
            <Button
              asChild
              className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Link href="/pricing">
                View Plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Active Projects Limit Dialog */}
      <Dialog
        open={errorDialog.open && errorDialog.type === "max_active_projects"}
        onOpenChange={(open: boolean) =>
          setErrorDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle>{errorDialog.title}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="text-left space-y-3 text-sm text-muted-foreground">
            <p>
              You can only have{" "}
              <span className="font-medium text-foreground">
                1 active project
              </span>{" "}
              on your current plan.
            </p>
            <p>To activate this project, you can either:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pause your currently active project first</li>
              <li>Upgrade your plan to run more projects simultaneously</li>
            </ul>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setErrorDialog((prev) => ({ ...prev, open: false }))
              }
            >
              Got it
            </Button>
            <Button
              asChild
              className="gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-400 hover:to-teal-500 text-white shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Link href="/pricing">
                View Plans
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
