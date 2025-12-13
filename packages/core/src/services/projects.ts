/**
 * Project CRUD service
 *
 * Handles all Firestore operations for projects.
 * Uses subcollection pattern: users/{userId}/projects/{projectId}
 * Works with both Admin SDK (server) and Client SDK (browser)
 */

import {
  db as defaultDb,
  isUsingAdminSDK as defaultIsUsingAdminSDK,
} from "./firebase";
import type { Project, NewProject, ProjectStatus } from "../models/project";
import { calculateNextRunAt as calculateNextRunAtWithTimezone } from "../utils/scheduling";

/**
 * Get the projects collection reference for a user
 * Works with both Admin SDK and Client SDK
 */
function getProjectsCollection(
  userId: string,
  dbInstance: any = defaultDb,
  isAdminSDK: boolean = defaultIsUsingAdminSDK
) {
  if (isAdminSDK) {
    // Admin SDK API
    return dbInstance.collection("users").doc(userId).collection("projects");
  } else {
    // Client SDK API - need to use collection/doc functions
    const { collection, doc } = require("firebase/firestore");
    return collection(doc(collection(dbInstance, "users"), userId), "projects");
  }
}

/**
 * Get a project document reference
 */
function getProjectRef(
  userId: string,
  projectId: string,
  dbInstance: any = defaultDb,
  isAdminSDK: boolean = defaultIsUsingAdminSDK
) {
  if (isAdminSDK) {
    return dbInstance
      .collection("users")
      .doc(userId)
      .collection("projects")
      .doc(projectId);
  } else {
    const { doc, collection } = require("firebase/firestore");
    return doc(
      collection(doc(collection(dbInstance, "users"), userId), "projects"),
      projectId
    );
  }
}

/**
 * Create a new project for a user
 */
export async function createProject(
  userId: string,
  data: Omit<NewProject, "userId">,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<Project> {
  try {
    const now = Date.now();

    // Set default settings if not provided
    const settings = data.settings || {
      relevancyThreshold: 60,
      minResults: 5,
      maxResults: 20,
    };

    const projectData: Omit<Project, "id"> = {
      userId,
      title: data.title,
      description: data.description,
      frequency: data.frequency,
      resultsDestination: data.resultsDestination,
      deliveryTime: data.deliveryTime,
      timezone: data.timezone,
      searchParameters: data.searchParameters,
      settings,
      deliveryConfig: data.deliveryConfig,
      status: "draft", // New projects start as draft
      nextRunAt: calculateNextRunAtWithTimezone(
        data.frequency,
        data.deliveryTime,
        data.timezone
      ),
      createdAt: now,
      updatedAt: now,
    };

    const collectionRef = getProjectsCollection(userId, dbInstance, isAdminSDK);

    let docRef;
    if (isAdminSDK) {
      // Admin SDK uses .add()
      docRef = await collectionRef.add(projectData);
    } else {
      // Client SDK uses addDoc()
      const { addDoc } = require("firebase/firestore");
      docRef = await addDoc(collectionRef, projectData);
    }

    return {
      id: docRef.id,
      ...projectData,
    };
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}

/**
 * List all projects for a user (one-time fetch)
 */
export async function listProjects(
  userId: string,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<Project[]> {
  try {
    let snapshot;
    if (isAdminSDK) {
      // Admin SDK
      snapshot = await getProjectsCollection(userId, dbInstance, isAdminSDK)
        .orderBy("createdAt", "desc")
        .get();
    } else {
      // Client SDK - need to use getDocs with query
      const { query, orderBy, getDocs } = require("firebase/firestore");
      const collectionRef = getProjectsCollection(
        userId,
        dbInstance,
        isAdminSDK
      );
      const q = query(collectionRef, orderBy("createdAt", "desc"));
      snapshot = await getDocs(q);
    }

    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        // Convert timestamps to numbers for consistency (Client SDK)
        createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
      };
    }) as Project[];
  } catch (error) {
    console.error("Error listing projects:", error);
    throw error;
  }
}

/**
 * Subscribe to projects for a user (real-time updates)
 * Returns an unsubscribe function
 */
export function subscribeToProjects(
  userId: string,
  callback: (projects: Project[]) => void,
  dbInstance?: any,
  isAdminSDK?: boolean
): () => void {
  if (isAdminSDK) {
    // Admin SDK - can use onSnapshot directly on collection reference
    return getProjectsCollection(userId, dbInstance, isAdminSDK)
      .orderBy("createdAt", "desc")
      .onSnapshot(
        (snapshot: any) => {
          const projects = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          })) as Project[];
          callback(projects);
        },
        (error: any) => {
          console.error("Error subscribing to projects:", error);
        }
      );
  } else {
    // Client SDK - need to use onSnapshot with query
    const { query, orderBy, onSnapshot } = require("firebase/firestore");
    const collectionRef = getProjectsCollection(userId, dbInstance, isAdminSDK);
    const q = query(collectionRef, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snapshot: any) => {
        const projects: Project[] = [];
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          projects.push({
            id: doc.id,
            ...data,
            // Convert timestamps to numbers for consistency
            createdAt:
              data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
            updatedAt:
              data.updatedAt?.toMillis?.() || data.updatedAt || Date.now(),
          } as Project);
        });
        callback(projects);
      },
      (error: any) => {
        console.error("Error subscribing to projects:", error);
      }
    );
  }
}

/**
 * Update project status
 */
export async function updateProjectStatus(
  userId: string,
  projectId: string,
  status: ProjectStatus,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<void> {
  try {
    const projectRef = getProjectRef(userId, projectId, dbInstance, isAdminSDK);
    const updateData = {
      status,
      updatedAt: Date.now(),
    };

    if (isAdminSDK) {
      await projectRef.update(updateData);
    } else {
      const { updateDoc } = require("firebase/firestore");
      await updateDoc(projectRef, updateData);
    }
  } catch (error) {
    console.error("Error updating project status:", error);
    throw error;
  }
}

/**
 * Update project execution tracking after a research run
 */
export async function updateProjectExecution(
  userId: string,
  projectId: string,
  updates: {
    status?: ProjectStatus;
    lastRunAt?: number;
    nextRunAt?: number;
    lastError?: string;
  },
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<void> {
  try {
    const projectRef = getProjectRef(userId, projectId, dbInstance, isAdminSDK);
    const updateData = {
      ...updates,
      updatedAt: Date.now(),
    };

    if (isAdminSDK) {
      await projectRef.update(updateData);
    } else {
      const { updateDoc } = require("firebase/firestore");
      await updateDoc(projectRef, updateData);
    }
  } catch (error) {
    console.error("Error updating project execution:", error);
    throw error;
  }
}

/**
 * Activate a project (change from draft to active)
 */
export async function activateProject(
  userId: string,
  projectId: string,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<void> {
  try {
    const projectRef = getProjectRef(userId, projectId, dbInstance, isAdminSDK);

    // Get current project data to calculate nextRunAt
    let projectDoc;
    if (isAdminSDK) {
      projectDoc = await projectRef.get();
      if (!projectDoc.exists) {
        throw new Error("Project not found");
      }
    } else {
      const { getDoc } = require("firebase/firestore");
      projectDoc = await getDoc(projectRef);
      if (!projectDoc.exists()) {
        throw new Error("Project not found");
      }
    }

    const project = projectDoc.data() as Project;

    // Calculate nextRunAt based on project's frequency, deliveryTime, and timezone
    const nextRunAt = calculateNextRunAtWithTimezone(
      project.frequency,
      project.deliveryTime,
      project.timezone
    );

    const updateData = {
      status: "active" as ProjectStatus,
      nextRunAt,
      updatedAt: Date.now(),
    };

    if (isAdminSDK) {
      await projectRef.update(updateData);
    } else {
      const { updateDoc } = require("firebase/firestore");
      await updateDoc(projectRef, updateData);
    }
  } catch (error) {
    console.error("Error activating project:", error);
    throw error;
  }
}

/**
 * Update a project with partial data
 */
export async function updateProject(
  userId: string,
  projectId: string,
  data: Partial<Omit<Project, "id" | "userId" | "createdAt">>,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<void> {
  try {
    const projectRef = getProjectRef(userId, projectId, dbInstance, isAdminSDK);

    // If frequency, deliveryTime, or timezone are being updated, recalculate nextRunAt
    if (data.frequency || data.deliveryTime || data.timezone) {
      // Get current project to merge with updates
      let projectDoc;
      if (isAdminSDK) {
        projectDoc = await projectRef.get();
        if (!projectDoc.exists) {
          throw new Error("Project not found");
        }
      } else {
        const { getDoc } = require("firebase/firestore");
        projectDoc = await getDoc(projectRef);
        if (!projectDoc.exists()) {
          throw new Error("Project not found");
        }
      }

      const currentProject = projectDoc.data() as Project;
      const updatedFrequency = data.frequency || currentProject.frequency;
      const updatedDeliveryTime =
        data.deliveryTime || currentProject.deliveryTime;
      const updatedTimezone = data.timezone || currentProject.timezone;

      const nextRunAt = calculateNextRunAtWithTimezone(
        updatedFrequency,
        updatedDeliveryTime,
        updatedTimezone
      );

      const updateData = {
        ...data,
        nextRunAt,
        updatedAt: Date.now(),
      };

      if (isAdminSDK) {
        await projectRef.update(updateData);
      } else {
        const { updateDoc } = require("firebase/firestore");
        await updateDoc(projectRef, updateData);
      }
    } else {
      const updateData = {
        ...data,
        updatedAt: Date.now(),
      };

      if (isAdminSDK) {
        await projectRef.update(updateData);
      } else {
        const { updateDoc } = require("firebase/firestore");
        await updateDoc(projectRef, updateData);
      }
    }
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}

/**
 * Delete a project
 */
export async function deleteProject(
  userId: string,
  projectId: string,
  dbInstance?: any,
  isAdminSDK?: boolean
): Promise<void> {
  try {
    const projectRef = getProjectRef(userId, projectId, dbInstance, isAdminSDK);
    if (isAdminSDK) {
      await projectRef.delete();
    } else {
      const { deleteDoc } = require("firebase/firestore");
      await deleteDoc(projectRef);
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}
