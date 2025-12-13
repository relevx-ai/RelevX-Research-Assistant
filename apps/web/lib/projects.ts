/**
 * Projects management for web app
 *
 * Thin wrapper around core package functions using web app's Firebase instance.
 * All business logic is in packages/core.
 */

import { db } from "./firebase";
import type { Project, NewProject, ProjectStatus } from "core";
import {
  subscribeToProjects as coreSubscribeToProjects,
  createProject as coreCreateProject,
  updateProject as coreUpdateProject,
  updateProjectStatus as coreUpdateProjectStatus,
  deleteProject as coreDeleteProject,
} from "core";
import type { Unsubscribe } from "firebase/firestore";

// Re-export types from core package
export type {
  Project,
  NewProject,
  Frequency,
  ResultsDestination,
  ProjectStatus,
  SearchParameters,
  ProjectSettings,
} from "core";

/**
 * Subscribe to real-time updates for a user's projects
 */
export function subscribeToProjects(
  userId: string,
  callback: (projects: Project[]) => void
): Unsubscribe {
  return coreSubscribeToProjects(userId, callback, db, false);
}

/**
 * Create a new project
 */
export async function createProject(
  userId: string,
  data: Omit<NewProject, "userId">
): Promise<Project> {
  return coreCreateProject(userId, data, db, false);
}

/**
 * Update an existing project
 */
export async function updateProject(
  userId: string,
  projectId: string,
  data: Partial<Omit<Project, "id" | "userId" | "createdAt">>
): Promise<void> {
  return coreUpdateProject(userId, projectId, data, db, false);
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  userId: string,
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  return coreUpdateProjectStatus(userId, projectId, status, db, false);
}

/**
 * Toggle project active status (alias for updateProjectStatus)
 */
export async function toggleProjectActive(
  userId: string,
  projectId: string,
  status: ProjectStatus
): Promise<void> {
  return updateProjectStatus(userId, projectId, status);
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string
): Promise<void> {
  return coreDeleteProject(userId, projectId, db, false);
}
