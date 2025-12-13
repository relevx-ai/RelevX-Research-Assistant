/**
 * Authentication helpers for web app
 *
 * Web-specific auth logic using core types.
 */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { auth } from "./firebase";
import { CreateProfileResponse, RelevxUser } from "core";
import { relevx_api } from "./client";

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<RelevxUser | null> {
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Error signing in with Google:", error);
    throw error;
  }

  try {
    // Get the authenticated user's UID
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user");
    }

    // Create or update user document in Firestore
    const response = await createOrUpdateUser();
    if (!response.ok) {
      throw new Error("Failed to create or update user");
    }

    // Combine response with uid from Firebase auth
    // Exclude 'ok' property as it's not part of RelevxUser
    const { ok, ...userData } = response;
    const user: RelevxUser = {
      ...userData,
      uid: currentUser.uid,
    };
    return user;
  } catch (error) {
    console.error("Error creating or updating user:", error);
    signOut();
    throw error;
  }
}

/**
 * Create or update a user document in Firestore
 * This should be called after successful authentication
 */
export async function createOrUpdateUser(): Promise<CreateProfileResponse> {
  try {
    const response = await relevx_api.post<CreateProfileResponse>(
      "/api/v1/user/auth/create-or-update"
    );
    return response;
  } catch (error) {
    console.error("Error creating or updating user:", error);
    signOut();
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out:", error);
    throw error;
  }
}
