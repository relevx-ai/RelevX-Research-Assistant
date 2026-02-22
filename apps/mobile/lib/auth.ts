/**
 * Authentication helpers for mobile app
 *
 * Mirrors apps/web/lib/auth.ts patterns using React Native Firebase.
 */

import { auth } from "./firebase";
import { apiFetch } from "./api-client";
import type { CreateProfileResponse } from "core";

/**
 * Sync the current Firebase user's profile with the backend.
 * Called after sign-in and on auth state changes.
 */
export async function syncUserProfile(): Promise<CreateProfileResponse> {
  const response = await apiFetch<CreateProfileResponse>(
    "/api/v1/user/auth/create-or-update",
    { method: "POST", body: JSON.stringify({}) }
  );
  return response;
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  await auth().signOut();
}
