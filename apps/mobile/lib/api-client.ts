/**
 * API client for mobile app
 *
 * Mirrors apps/web/lib/client.ts — gets Firebase ID token, sets Authorization
 * header, calls backend directly (no CORS proxy needed in React Native).
 */

import { auth } from "./firebase";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

type ApiErrorEnvelope = { error?: { message?: string } };

async function getIdToken(): Promise<string | null> {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) return null;
    return await currentUser.getIdToken(true);
  } catch (error) {
    console.error("Error getting Firebase ID token:", error);
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const idToken = await getIdToken();

  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
    "content-type": "application/json",
    ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    // raw text
  }

  if (!res.ok) {
    const message =
      (data as ApiErrorEnvelope | undefined)?.error?.message ||
      (typeof text === "string" && text) ||
      `Request failed (${res.status})`;
    throw new ApiError(String(message), res.status);
  }

  return data as T;
}

export const api = {
  get<T>(path: string, headers?: Record<string, string>): Promise<T> {
    return apiFetch<T>(path, { method: "GET", headers });
  },
  post<T>(
    path: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    return apiFetch<T>(path, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
      headers,
    });
  },
  delete<T>(
    path: string,
    body?: Record<string, unknown>,
    headers?: Record<string, string>
  ): Promise<T> {
    return apiFetch<T>(path, {
      method: "DELETE",
      body: JSON.stringify(body ?? {}),
      headers,
    });
  },
};
