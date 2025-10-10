"use client";

// Simple in-memory token cache for client-side usage.
let cachedToken: string | null = null;

export async function getValidToken(forceRefresh = false): Promise<string | null> {
  // If we have a cached token and not forcing refresh, return it
  if (!forceRefresh && cachedToken) {
    return cachedToken;
  }

  // Get token from localStorage (local authentication)
  try {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("auth_token");
      if (token) {
        cachedToken = token;
        return token;
      }
    }
  } catch (error) {
    console.error("Error reading token from localStorage:", error);
  }

  cachedToken = null;
  return null;
}

export function clearCachedToken() {
  cachedToken = null;

  // Also clear from localStorage
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  } catch (error) {
    console.error("Error clearing token from localStorage:", error);
  }
}
