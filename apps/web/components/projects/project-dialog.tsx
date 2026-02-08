"use client";

import React, { useState, useEffect } from "react";
import type {
  ProjectInfo,
  Frequency,
  ImproveProjectDescriptionRequest,
  ImproveProjectDescriptionResponse,
} from "core";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TimePicker } from "@/components/ui/time-picker";
import { DayOfWeekPicker } from "@/components/ui/day-of-week-picker";
import { DayOfMonthPicker } from "@/components/ui/day-of-month-picker";
import {
  Sparkles,
  Calendar,
  ChevronDown,
  Settings,
  Loader2,
  Info,
  ArrowRight,
  HelpCircle,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useProjects } from "@/hooks/use-projects";
import { relevx_api, ApiError } from "@/lib/client";
import Link from "next/link";
import { SUPPORTED_LANGUAGES, SUPPORTED_REGIONS, OUTPUT_LANGUAGES } from '@/lib/constants/languages';
import { ProFeatureWrapper } from '@/components/ui/pro-feature-wrapper';
import { usePro } from '@/hooks/use-pro';

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // If project is provided → edit mode; if omitted → create mode
  project?: ProjectInfo;
  // Create-mode only
  projects?: ProjectInfo[];
  onProjectCreated?: () => void;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  projects = [],
  onProjectCreated,
}: ProjectDialogProps) {
  const isEditMode = !!project;

  const { createProject, updateProject } = useProjects({ subscribe: false });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("daily");
  const [dayOfWeek, setDayOfWeek] = useState<number>(1);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [deliveryTime, setDeliveryTime] = useState("09:00");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [priorityDomains, setPriorityDomains] = useState("");
  const [excludedDomains, setExcludedDomains] = useState("");
  const [requiredKeywords, setRequiredKeywords] = useState("");
  const [excludedKeywords, setExcludedKeywords] = useState("");
  const [searchLanguage, setSearchLanguage] = useState("");
  const [searchRegion, setSearchRegion] = useState("");
  const [outputLanguage, setOutputLanguage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [titleError, setTitleError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Create-mode only state
  const [suggestedDescription, setSuggestedDescription] = useState("");
  const [isSuggestionDialogOpen, setIsSuggestionDialogOpen] = useState(false);
  const [pausedInfoDialogOpen, setPausedInfoDialogOpen] = useState(false);
  const [maxActiveProjects, setMaxActiveProjects] = useState(1);

  const { isPro } = usePro();

  const arrayToString = (arr: string[] | undefined): string => {
    return arr ? arr.join(", ") : "";
  };

  const parseList = (value: string): string[] => {
    if (!value.trim()) return [];
    return value
      .split(/[,\n]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  // Sync form state from project when opening in edit mode
  useEffect(() => {
    if (isEditMode && open && project) {
      setTitle(project.title);
      setDescription(project.description);
      setFrequency(project.frequency);
      setDayOfWeek(project.dayOfWeek ?? 1);
      setDayOfMonth(project.dayOfMonth ?? 1);
      setDeliveryTime(project.deliveryTime || "09:00");
      setTimezone(
        project.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      setPriorityDomains(
        arrayToString(project.searchParameters?.priorityDomains)
      );
      setExcludedDomains(
        arrayToString(project.searchParameters?.excludedDomains)
      );
      setRequiredKeywords(
        arrayToString(project.searchParameters?.requiredKeywords)
      );
      setExcludedKeywords(
        arrayToString(project.searchParameters?.excludedKeywords)
      );
      setSearchLanguage(project.searchParameters?.language || "");
      setSearchRegion(project.searchParameters?.region || "");
      setOutputLanguage(project.searchParameters?.outputLanguage || "");
      setError("");
    }
  }, [isEditMode, open, project]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setFrequency("daily");
    setDayOfWeek(1);
    setDayOfMonth(1);
    setDeliveryTime("09:00");
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    setPriorityDomains("");
    setExcludedDomains("");
    setRequiredKeywords("");
    setExcludedKeywords("");
    setSearchLanguage("");
    setSearchRegion("");
    setOutputLanguage("");
    setError("");
    setTitleError("");
  };

  const handleEnhanceDescription = async () => {
    const desc = String(description || "");
    if (!desc.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const request: ImproveProjectDescriptionRequest = {
        description: desc.trim() || "research project",
      };
      const response = await relevx_api.post<ImproveProjectDescriptionResponse>(
        "/api/v1/ai/improve-project-description",
        request as any
      );
      if (response.description) {
        if (isEditMode) {
          // Edit mode: apply directly
          setDescription(response.description);
        } else {
          // Create mode: show suggestion dialog
          setSuggestedDescription(response.description);
          setIsSuggestionDialogOpen(true);
        }
      }
    } catch (err) {
      console.error("Failed to enhance description:", err);
      setError("Failed to enhance description. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTitleError("");

    // Validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter a project title");
      return;
    }

    // Create-mode: client-side duplicate check
    if (!isEditMode && projects.some((p) => p.title.toLowerCase() === trimmedTitle.toLowerCase())) {
      setTitleError(
        "A project with this name already exists. Please choose a different title."
      );
      return;
    }

    if (!String(description || "").trim()) {
      setError("Please enter a description");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && project) {
        // --- Edit mode submit ---
        const priorityDomainsList = parseList(priorityDomains);
        const excludedDomainsList = parseList(excludedDomains);
        const requiredKeywordsList = parseList(requiredKeywords);
        const excludedKeywordsList = parseList(excludedKeywords);

        const searchParameters: any = {
          ...project.searchParameters,
        };

        if (priorityDomainsList.length > 0) {
          searchParameters.priorityDomains = priorityDomainsList;
        } else {
          delete searchParameters.priorityDomains;
        }

        if (excludedDomainsList.length > 0) {
          searchParameters.excludedDomains = excludedDomainsList;
        } else {
          delete searchParameters.excludedDomains;
        }

        if (requiredKeywordsList.length > 0) {
          searchParameters.requiredKeywords = requiredKeywordsList;
        } else {
          delete searchParameters.requiredKeywords;
        }

        if (excludedKeywordsList.length > 0) {
          searchParameters.excludedKeywords = excludedKeywordsList;
        } else {
          delete searchParameters.excludedKeywords;
        }

        if (isPro) {
          if (searchLanguage) {
            searchParameters.language = searchLanguage;
          } else {
            delete searchParameters.language;
          }
          if (searchRegion) {
            searchParameters.region = searchRegion;
          } else {
            delete searchParameters.region;
          }
          if (outputLanguage) {
            searchParameters.outputLanguage = outputLanguage;
          } else {
            delete searchParameters.outputLanguage;
          }
        } else {
          delete searchParameters.language;
          delete searchParameters.region;
          delete searchParameters.outputLanguage;
        }

        const updateData: any = {
          title: title.trim(),
          description: description.trim(),
          frequency,
          resultsDestination: "email",
          deliveryTime,
          timezone,
          ...(frequency === "weekly" && { dayOfWeek }),
          ...(frequency === "monthly" && { dayOfMonth }),
          ...(frequency === "daily" && { dayOfWeek: null, dayOfMonth: null }),
          ...(frequency === "weekly" && { dayOfMonth: null }),
          ...(frequency === "monthly" && { dayOfWeek: null }),
          ...(frequency === "once" && { dayOfWeek: null, dayOfMonth: null }),
        };

        if (
          Object.keys(searchParameters).length > 0 ||
          project.searchParameters
        ) {
          updateData.searchParameters = searchParameters;
        }

        const success = await updateProject(project.title, updateData);

        if (success) {
          onOpenChange(false);
        } else {
          setError("Failed to update project. Please try again.");
        }
      } else {
        // --- Create mode submit ---
        const searchParameters: any = {};
        const priorityDomainsList = parseList(priorityDomains);
        const excludedDomainsList = parseList(excludedDomains);
        const requiredKeywordsList = parseList(requiredKeywords);
        const excludedKeywordsList = parseList(excludedKeywords);

        if (priorityDomainsList.length > 0) {
          searchParameters.priorityDomains = priorityDomainsList;
        }
        if (excludedDomainsList.length > 0) {
          searchParameters.excludedDomains = excludedDomainsList;
        }
        if (requiredKeywordsList.length > 0) {
          searchParameters.requiredKeywords = requiredKeywordsList;
        }
        if (excludedKeywordsList.length > 0) {
          searchParameters.excludedKeywords = excludedKeywordsList;
        }

        if (isPro) {
          if (searchLanguage) searchParameters.language = searchLanguage;
          if (searchRegion) searchParameters.region = searchRegion;
          if (outputLanguage) searchParameters.outputLanguage = outputLanguage;
        }

        const cprojectinfo: any = {
          title: title.trim(),
          description: String(description || "").trim(),
          frequency,
          resultsDestination: "email",
          deliveryTime,
          timezone,
          settings: {
            relevancyThreshold: 60,
            minResults: 5,
            maxResults: 20,
          },
        };

        if (frequency === "weekly") {
          cprojectinfo.dayOfWeek = dayOfWeek;
        }
        if (frequency === "monthly") {
          cprojectinfo.dayOfMonth = dayOfMonth;
        }

        const response = await createProject({
          ...cprojectinfo,
          ...(Object.keys(searchParameters).length > 0 && { searchParameters }),
        });

        resetForm();
        onOpenChange(false);
        onProjectCreated?.();

        if (response?.createdAsPaused) {
          setMaxActiveProjects(response.maxActiveProjects || 1);
          setPausedInfoDialogOpen(true);
        }
      }
    } catch (err: any) {
      if (isEditMode) {
        console.error("Failed to update project:", err);
        setError(
          err instanceof ApiError ? err.message : "Failed to update project. Please try again."
        );
      } else {
        const errorMessage = err?.message || err?.toString() || "";
        if (errorMessage.toLowerCase().includes("title already exists")) {
          setTitleError(
            "A project with this name already exists. Please choose a different title."
          );
        } else if (err instanceof ApiError) {
          setError(err.message);
        } else {
          console.error("Failed to create project:", err);
          setError("Failed to create project. Please try again.");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptSuggestion = () => {
    setDescription(String(suggestedDescription || ""));
    setIsSuggestionDialogOpen(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isSubmitting) {
      onOpenChange(newOpen);
      // Reset form when closing in create mode
      if (!newOpen && !isEditMode) {
        resetForm();
      }
    }
  };

  // Field ID prefix for uniqueness
  const idPrefix = isEditMode ? "edit-" : "";

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-[750px] max-h-[85vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                {isEditMode ? (
                  <Settings className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <DialogTitle>
                {isEditMode ? "Project Settings" : "Create New Project"}
              </DialogTitle>
            </div>
            <DialogDescription>
              {isEditMode
                ? "Update your project settings. Changes will take effect on the next scheduled research run."
                : "Set up a new research project. Our AI will automatically search and deliver curated insights based on your schedule."}
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col flex-1 min-h-0"
          >
            {/* Error Message - Top (create mode) */}
            {!isEditMode && error && (
              <div className="mx-1 mt-4 mb-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-6 py-4 px-1 overflow-y-auto flex-1">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor={`${idPrefix}title`}>
                  Project Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`${idPrefix}title`}
                  placeholder="e.g., AI Research Updates"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (titleError) setTitleError("");
                  }}
                  disabled={isSubmitting}
                  className={
                    titleError
                      ? "border-red-500 focus-visible:ring-red-500"
                      : ""
                  }
                />
                {titleError && (
                  <p className="text-sm text-red-500 font-medium">
                    {titleError}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`${idPrefix}description`}>
                    What to Research <span className="text-destructive">*</span>
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={`h-8 gap-1.5 text-xs border-coral-400/30 hover:border-coral-400/50 hover:bg-coral-500/10 relative overflow-hidden ${
                      isEnhancing ? "animate-shimmer" : ""
                    }`}
                    onClick={handleEnhanceDescription}
                    disabled={isSubmitting || isEnhancing || !description.trim()}
                  >
                    {isEnhancing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-coral-400" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 text-coral-400" />
                    )}
                    {isEnhancing ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                </div>
                <Textarea
                  id={`${idPrefix}description`}
                  placeholder="e.g., Latest developments in AI and machine learning, focusing on practical applications and breakthrough research"
                  value={description}
                  onChange={(e) => {
                    if (e.target.value.length <= 2000) {
                      setDescription(e.target.value);
                    }
                  }}
                  disabled={isSubmitting}
                  rows={4}
                  maxLength={2000}
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Be specific about what you want to track. The more detailed,
                    the better the results.
                  </p>
                  <p
                    className={`text-xs ${
                      description.length > 1800
                        ? "text-amber-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    {description.length}/2000
                  </p>
                </div>
              </div>

              {/* Schedule Card */}
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Schedule
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}frequency`}>Frequency</Label>
                  <Select
                    id={`${idPrefix}frequency`}
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    disabled={isSubmitting || (isEditMode && project?.frequency === "once")}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="once">Once</option>
                  </Select>
                </div>

                {/* Scheduling Options Row - hidden for Once */}
                {frequency === "once" ? (
                  <p className="text-sm text-muted-foreground">
                    Will run immediately
                  </p>
                ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Day of Week (for weekly frequency) */}
                  {frequency === "weekly" && (
                    <div className="space-y-2">
                      <Label>Day of Week</Label>
                      <DayOfWeekPicker
                        value={dayOfWeek}
                        onChange={setDayOfWeek}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {/* Day of Month (for monthly frequency) */}
                  {frequency === "monthly" && (
                    <div className="space-y-2">
                      <Label>Day of Month</Label>
                      <DayOfMonthPicker
                        value={dayOfMonth}
                        onChange={setDayOfMonth}
                        disabled={isSubmitting}
                      />
                    </div>
                  )}

                  {/* Placeholder for daily to maintain consistent layout */}
                  {frequency === "daily" && (
                    <div className="space-y-2 hidden sm:block">
                      <Label className="text-muted-foreground">Repeats</Label>
                      <div className="h-[108px] flex items-center justify-center text-sm text-muted-foreground bg-muted/50 rounded-md border border-dashed border-border">
                        Every day
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Time</Label>
                    <TimePicker
                      value={deliveryTime}
                      onChange={setDeliveryTime}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`${idPrefix}timezone`}>Timezone</Label>
                    <Select
                      id={`${idPrefix}timezone`}
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="America/New_York">
                        Eastern Time (ET)
                      </option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">
                        Pacific Time (PT)
                      </option>
                      <option value="America/Anchorage">
                        Alaska Time (AKT)
                      </option>
                      <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                      <option value="Europe/London">London (GMT/BST)</option>
                      <option value="Europe/Paris">Paris (CET/CEST)</option>
                      <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Asia/Shanghai">Shanghai (CST)</option>
                      <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                      <option value="Asia/Singapore">Singapore (SGT)</option>
                      <option value="Asia/Dubai">Dubai (GST)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Australia/Sydney">
                        Sydney (AEDT/AEST)
                      </option>
                      <option value="Australia/Melbourne">
                        Melbourne (AEDT/AEST)
                      </option>
                      <option value="Pacific/Auckland">
                        Auckland (NZDT/NZST)
                      </option>
                      <option value="UTC">UTC</option>
                    </Select>
                  </div>
                </div>
                )}
              </div>

              {/* Advanced Settings Collapsible */}
              <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  className="w-full flex items-center justify-between p-4 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-inset"
                >
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    Advanced Settings
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-muted-foreground transition-transform duration-300 ${
                      advancedOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    advancedOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* Priority Domains */}
                      <ProFeatureWrapper isPro={isPro} featureName="Priority Domains">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor={`${idPrefix}priorityDomains`}>
                              Priority Domains
                            </Label>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                    <span className="sr-only">Help</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="max-w-[250px] z-[100]"
                                >
                                  <p className="text-xs">
                                    Results from these domains will be ranked
                                    higher in your research brief. Useful for
                                    trusted news sources or industry-specific
                                    sites.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            id={`${idPrefix}priorityDomains`}
                            placeholder="e.g., reuters.com, techcrunch.com"
                            value={priorityDomains}
                            onChange={(e) => setPriorityDomains(e.target.value)}
                            disabled={isSubmitting || !isPro}
                            rows={2}
                          />
                        </div>
                      </ProFeatureWrapper>

                      {/* Excluded Domains */}
                      <ProFeatureWrapper isPro={isPro} featureName="Excluded Domains">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor={`${idPrefix}excludedDomains`}>
                              Excluded Domains
                            </Label>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                    <span className="sr-only">Help</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="max-w-[250px] z-[100]"
                                >
                                  <p className="text-xs">
                                    Results from these domains will be completely
                                    filtered out. Use for blocking low-quality or
                                    irrelevant sources.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            id={`${idPrefix}excludedDomains`}
                            placeholder="e.g., spam-site.com, clickbait.com"
                            value={excludedDomains}
                            onChange={(e) => setExcludedDomains(e.target.value)}
                            disabled={isSubmitting || !isPro}
                            rows={2}
                          />
                        </div>
                      </ProFeatureWrapper>

                      {/* Required Keywords */}
                      <ProFeatureWrapper isPro={isPro} featureName="Keyword Filters">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor={`${idPrefix}requiredKeywords`}>
                              Keywords to Search For
                            </Label>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                    <span className="sr-only">Help</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="max-w-[250px] z-[100]"
                                >
                                  <p className="text-xs">
                                    These keywords will be added to search queries
                                    to help find more relevant results. Think of
                                    them as search refinements.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            id={`${idPrefix}requiredKeywords`}
                            placeholder="e.g., machine learning, neural networks"
                            value={requiredKeywords}
                            onChange={(e) => setRequiredKeywords(e.target.value)}
                            disabled={isSubmitting || !isPro}
                            rows={2}
                          />
                        </div>
                      </ProFeatureWrapper>

                      {/* Excluded Keywords */}
                      <ProFeatureWrapper isPro={isPro} featureName="Keyword Filters">
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5">
                            <Label htmlFor={`${idPrefix}excludedKeywords`}>
                              Excluded Keywords
                            </Label>
                            <TooltipProvider delayDuration={0}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" className="inline-flex">
                                    <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                    <span className="sr-only">Help</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="max-w-[250px] z-[100]"
                                >
                                  <p className="text-xs">
                                    Content containing these keywords will be
                                    filtered out from your results. Useful for
                                    removing sponsored content or off-topic
                                    articles.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Textarea
                            id={`${idPrefix}excludedKeywords`}
                            placeholder="e.g., sponsored, advertisement"
                            value={excludedKeywords}
                            onChange={(e) => setExcludedKeywords(e.target.value)}
                            disabled={isSubmitting || !isPro}
                            rows={2}
                          />
                        </div>
                      </ProFeatureWrapper>

                      {/* Search Language */}
                      <ProFeatureWrapper isPro={isPro} featureName="Language Filter">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`${idPrefix}searchLanguage`}>Search Language</Label>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex">
                                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                      <span className="sr-only">Help</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[250px] z-[100]">
                                    <p className="text-xs">
                                      Filter search results to only include content in the specified language.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              id={`${idPrefix}searchLanguage`}
                              value={searchLanguage}
                              onChange={(e) => setSearchLanguage(e.target.value)}
                              disabled={isSubmitting || !isPro}
                            >
                              {SUPPORTED_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </ProFeatureWrapper>

                        {/* Search Region */}
                        <ProFeatureWrapper isPro={isPro} featureName="Location Filter">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`${idPrefix}searchRegion`}>Search Region</Label>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex">
                                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                      <span className="sr-only">Help</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[250px] z-[100]">
                                    <p className="text-xs">
                                      Filter search results to only include content from the specified country/region.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              id={`${idPrefix}searchRegion`}
                              value={searchRegion}
                              onChange={(e) => setSearchRegion(e.target.value)}
                              disabled={isSubmitting || !isPro}
                            >
                              {SUPPORTED_REGIONS.map((region) => (
                                <option key={region.code} value={region.code}>
                                  {region.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </ProFeatureWrapper>

                        {/* Output Language */}
                        <ProFeatureWrapper isPro={isPro} featureName="Report Translation">
                          <div className="space-y-2">
                            <div className="flex items-center gap-1.5">
                              <Label htmlFor={`${idPrefix}outputLanguage`}>Report Language</Label>
                              <TooltipProvider delayDuration={0}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="inline-flex">
                                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help" />
                                      <span className="sr-only">Help</span>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-[250px] z-[100]">
                                    <p className="text-xs">
                                      Language for your email report. Defaults to English if not specified.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <Select
                              id={`${idPrefix}outputLanguage`}
                              value={outputLanguage}
                              onChange={(e) => setOutputLanguage(e.target.value)}
                              disabled={isSubmitting || !isPro}
                            >
                              {OUTPUT_LANGUAGES.map((lang) => (
                                <option key={lang.code} value={lang.code}>
                                  {lang.name}
                                </option>
                              ))}
                            </Select>
                          </div>
                        </ProFeatureWrapper>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error Message - Bottom (edit mode) */}
              {isEditMode && error && (
                <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {isEditMode
                  ? isSubmitting ? "Saving..." : "Save Changes"
                  : isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create-mode only: Suggestion Dialog */}
      {!isEditMode && (
        <Dialog
          open={isSuggestionDialogOpen}
          onOpenChange={setIsSuggestionDialogOpen}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-coral-500 to-coral-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <DialogTitle>AI Improved Description</DialogTitle>
              </div>
              <DialogDescription>
                Review the AI-enhanced description for your project. You can
                accept it or ask the AI to try again.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="rounded-lg border border-coral-100 dark:border-coral-900 bg-coral-50/30 dark:bg-coral-900/10 p-4 min-h-[120px] text-sm leading-relaxed whitespace-pre-line">
                {isEnhancing ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-3 py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-coral-500" />
                    <p className="text-muted-foreground animate-pulse">
                      Generating new suggestion...
                    </p>
                  </div>
                ) : (
                  suggestedDescription
                )}
              </div>
            </div>

            <DialogFooter className="gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsSuggestionDialogOpen(false)}
                disabled={isEnhancing}
              >
                Discard
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleEnhanceDescription}
                  disabled={isEnhancing}
                  className="border-coral-200 hover:bg-coral-50 dark:border-coral-800 dark:hover:bg-coral-900/20"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button
                  type="button"
                  onClick={handleAcceptSuggestion}
                  disabled={isEnhancing}
                  className="bg-gradient-to-r from-coral-600 to-coral-500 hover:from-coral-500 hover:to-coral-400 text-white"
                >
                  Accept Suggestion
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create-mode only: Paused Project Info Dialog */}
      {!isEditMode && (
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
                Your project has been created successfully, but it's currently{" "}
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
      )}
    </>
  );
}
