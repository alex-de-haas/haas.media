"use client";

import { clearCachedToken, getValidToken } from "./token";

/**
 * Custom fetch wrapper that automatically handles 401 responses
 * by clearing the token cache and redirecting to login
 */
export async function fetchWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  try {
    // Get the valid token
    const token = await getValidToken();

    // Prepare headers
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Make the request
    const response = await fetch(input, {
      ...init,
      headers,
    });

    // Handle 401 Unauthorized
    if (response.status === 401) {
      console.warn("[fetchWithAuth] 401 Unauthorized - clearing token and redirecting to login");
      
      // Clear the cached token
      clearCachedToken();
      
      // Redirect to login page (works for both Auth0 and local auth)
      window.location.href = `/login`;
      
      // Return the response for any cleanup code
      return response;
    }

    return response;
  } catch (error) {
    console.error("[fetchWithAuth] Request failed:", error);
    throw error;
  }
}

/**
 * Fetch with auth that automatically parses JSON responses
 * and handles errors including 401 redirects
 */
export async function fetchJsonWithAuth<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const response = await fetchWithAuth(input, init);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.error || errorBody?.message || response.statusText;
    throw new Error(message);
  }

  return response.json();
}
