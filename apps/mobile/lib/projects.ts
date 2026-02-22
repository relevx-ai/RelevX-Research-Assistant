/**
 * Project CRUD service for mobile app
 *
 * Mirrors apps/web/lib/projects.ts — same endpoints, same types,
 * but uses direct fetch instead of Next.js proxy.
 */

import { api, ApiError } from "./api-client";
import type {
  NewProject,
  ProjectInfo,
  CreateProjectResponse,
  CreateProjectRequest,
  ProjectDeliveryLogResponse,
} from "core";

export class ProjectError extends Error {
  errorCode?: string;
  errorMessage?: string;
  constructor(message: string, errorCode?: string, errorMessage?: string) {
    super(message);
    this.name = "ProjectError";
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
  }
}

export async function createProject(
  data: NewProject
): Promise<CreateProjectResponse> {
  const settings = data.settings || {
    relevancyThreshold: 60,
    minResults: 5,
    maxResults: 20,
  };

  const projectData: NewProject = {
    title: data.title,
    description: data.description,
    frequency: data.frequency,
    resultsDestination: data.resultsDestination,
    deliveryTime: data.deliveryTime,
    timezone: data.timezone,
    searchParameters: data.searchParameters,
    settings,
    deliveryConfig: data.deliveryConfig,
    dayOfWeek: data.dayOfWeek,
    dayOfMonth: data.dayOfMonth,
  };

  const request: CreateProjectRequest = { projectInfo: projectData };

  const response = await api.post<CreateProjectResponse>(
    "/api/v1/user/projects/create",
    { ...request }
  );
  if (!response) throw new Error("Failed to create project");
  return response;
}

export async function listProjects(): Promise<ProjectInfo[]> {
  const response = await api.get<{ projects: ProjectInfo[] }>(
    "/api/v1/user/projects/list"
  );
  if (!response) throw new Error("Failed to list projects");
  return response.projects;
}

export async function updateProjectStatus(
  projectTitle: string,
  status: "active" | "paused"
): Promise<boolean> {
  const response = await api.post<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
  }>("/api/v1/user/projects/toggle-status", {
    title: projectTitle,
    status,
  });
  if (!response) throw new Error("Failed to update project status");

  if (response.errorCode) {
    throw new ProjectError(
      response.errorMessage || "Error updating project",
      response.errorCode,
      response.errorMessage
    );
  }
  return response.status === status;
}

export async function updateProject(
  projectTitle: string,
  data: Partial<Omit<ProjectInfo, "createdAt" | "updatedAt">>
): Promise<void> {
  const response = await api.post("/api/v1/user/projects/update", {
    title: projectTitle,
    data,
  });
  if (!response) throw new Error("Failed to update project");
}

export async function deleteProject(projectTitle: string): Promise<void> {
  const response = await api.post("/api/v1/user/projects/delete", {
    title: projectTitle,
  });
  if (!response) throw new Error("Failed to delete project");
}

export interface UsageResponse {
  ok: boolean;
  maxActiveProjects: number;
  oneShotRunsUsed: number;
  oneShotRunsLimit: number;
}

export async function fetchUsage(): Promise<UsageResponse> {
  const response = await api.get<UsageResponse>(
    "/api/v1/user/projects/usage"
  );
  if (!response) throw new Error("Failed to fetch usage");
  return response;
}

export interface RunNowResponse {
  ok: boolean;
  remainingRuns: number;
  monthlyLimit: number;
}

export async function runProjectNow(
  projectTitle: string
): Promise<RunNowResponse> {
  const response = await api.post<RunNowResponse>(
    "/api/v1/user/projects/run-now",
    { title: projectTitle }
  );
  if (!response) throw new Error("Failed to schedule run");
  return response;
}

export async function getProjectDeliveryLogs(
  projectTitle: string,
  limit: number = 5,
  offset: number = 0
): Promise<ProjectDeliveryLogResponse> {
  try {
    const response = await api.get<ProjectDeliveryLogResponse>(
      `/api/v1/user/projects/delivery-logs?limit=${limit}&offset=${offset}`,
      { projectId: projectTitle }
    );
    if (!response) throw new Error("Failed to fetch delivery logs");
    return response;
  } catch (error: any) {
    if (error instanceof ApiError && error.status === 404) {
      return {
        logs: [],
        pagination: { total: 0, limit, offset, hasMore: false },
      };
    }
    throw error;
  }
}

export async function improveProjectDescription(
  description: string
): Promise<string> {
  const response = await api.post<{ description: string }>(
    "/api/v1/ai/improve-project-description",
    { description }
  );
  return response.description;
}
