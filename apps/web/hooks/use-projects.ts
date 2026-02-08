/**
 * useProjects hook
 *
 * Provides real-time access to a user's projects and methods to manage them.
 */

import { useState, useEffect, useCallback } from "react";
import type {
  ProjectInfo,
  NewProject,
  ProjectStatus,
  CreateProjectResponse,
} from "../../../packages/core/src/models/project";
import {
  subscribeToProjects,
  createProject as createProjectService,
  updateProject as updateProjectService,
  updateProjectStatus,
  deleteProject as deleteProjectService,
  listProjects,
  runProjectNow as runProjectNowService,
} from "../lib/projects";
import { useAuth } from "../contexts/auth-context";

interface UseProjectsResult {
  projects: ProjectInfo[];
  loading: boolean;
  error: string | null;
  createProject: (
    data: Omit<NewProject, "userId">
  ) => Promise<CreateProjectResponse | null>;
  updateProject: (
    projectId: string,
    data: Partial<Omit<ProjectInfo, "updatedAt" | "createdAt">>
  ) => Promise<boolean>;
  toggleProjectStatus: (
    projectId: string,
    status: ProjectStatus
  ) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
  runProjectNow: (projectTitle: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

interface UseProjectsOptions {
  subscribe?: boolean;
}

export function useProjects(
  options: UseProjectsOptions = { subscribe: true }
): UseProjectsResult {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Array<ProjectInfo>>([]);
  const [loading, setLoading] = useState(options.subscribe ?? true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options.subscribe === false) {
      setLoading(false);
      return;
    }

    if (!user?.uid) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToProjects((newProjects) => {
      setProjects(newProjects);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid, options.subscribe]);

  const createProject = useCallback(
    async (data: Omit<NewProject, "userId">): Promise<CreateProjectResponse | null> => {
      if (!user?.uid) {
        setError("User must be logged in to create a project");
        throw new Error("User must be logged in to create a project");
      }

      try {
        const response = await createProjectService(data);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create project";
        setError(errorMessage);
        throw err; // Re-throw so callers can handle the error
      }
    },
    [user]
  );

  const updateProject = useCallback(
    async (
      projectTitle: string,
      data: Partial<Omit<ProjectInfo, "updatedAt" | "createdAt">>
    ): Promise<boolean> => {
      if (!user?.uid) {
        setError("User must be logged in to update a project");
        return false;
      }

      try {
        await updateProjectService(projectTitle, data);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update project";
        setError(errorMessage);
        return false;
      }
    },
    [user]
  );

  const toggleProjectStatus = useCallback(
    async (projectTitle: string, status: ProjectStatus): Promise<boolean> => {
      if (!user?.uid) {
        setError("User must be logged in to toggle project status");
        return false;
      }

      try {
        const response = await updateProjectStatus(projectTitle, status);
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to toggle project status";
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  const deleteProject = useCallback(
    async (projectTitle: string): Promise<boolean> => {
      if (!user?.uid) {
        setError("User must be logged in to delete a project");
        return false;
      }

      try {
        await deleteProjectService(projectTitle);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete project";
        setError(errorMessage);
        return false;
      }
    },
    [user]
  );

  const runProjectNow = useCallback(
    async (projectTitle: string): Promise<boolean> => {
      if (!user?.uid) {
        setError("User must be logged in to run a project");
        return false;
      }
      try {
        await runProjectNowService(projectTitle);
        return true;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to run project now";
        setError(errorMessage);
        throw err;
      }
    },
    [user]
  );

  const refresh = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const fetchedProjects = await listProjects();
      setProjects(fetchedProjects);
    } catch (err) {
      setError("Failed to refresh projects");
    } finally {
      setLoading(false);
    }
  }, [user]);

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    toggleProjectStatus,
    deleteProject,
    runProjectNow,
    refresh,
  };
}
