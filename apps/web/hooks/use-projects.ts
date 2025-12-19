/**
 * useProjects hook
 *
 * Provides real-time access to a user's projects and methods to manage them.
 */

import { useState, useEffect, useCallback } from "react";
import type { ProjectInfo, NewProject, ProjectStatus } from "../../../packages/core/src/models/project";
import {
  subscribeToProjects,
  createProject as createProjectService,
  updateProject as updateProjectService,
  updateProjectStatus,
  deleteProject as deleteProjectService,
} from "../lib/projects";
import { useAuth } from "../contexts/auth-context";

interface UseProjectsResult {
  projects: ProjectInfo[];
  loading: boolean;
  error: string | null;
  createProject: (data: Omit<NewProject, "userId">) => Promise<ProjectInfo | null>;
  updateProject: (
    projectId: string,
    data: Partial<Omit<ProjectInfo, "updatedAt" | "createdAt">>
  ) => Promise<boolean>;
  toggleProjectActive: (
    projectId: string,
    status: ProjectStatus
  ) => Promise<boolean>;
  deleteProject: (projectId: string) => Promise<boolean>;
}

export function useProjects(
): UseProjectsResult {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToProjects(
      (newProjects) => {
        setProjects(newProjects);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [user]);

  const createProject = useCallback(
    async (data: Omit<NewProject, "userId">): Promise<ProjectInfo | null> => {
      if (!user?.uid) {
        setError("User must be logged in to create a project");
        return null;
      }

      try {
        const newProject = await createProjectService(
          data,
        );
        return newProject;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create project";
        setError(errorMessage);
        return null;
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
        await updateProjectService(
          projectTitle,
          data,
        );
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

  const toggleProjectActive = useCallback(
    async (projectTitle: string, status: ProjectStatus): Promise<boolean> => {
      if (!user?.uid) {
        setError("User must be logged in to toggle project status");
        return false;
      }

      try {
        const response = await updateProjectStatus(
          projectTitle,
          status,
        );
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to toggle project status";
        setError(errorMessage);
        return false;
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

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    toggleProjectActive,
    deleteProject,
  };
}
