"use client";

// Simple in-memory token cache for client-side usage.
let cachedToken: string | null = null;
let fetching: Promise<string | null> | null = null;

export async function getValidToken(forceRefresh = false): Promise<string | null> {
  if (!forceRefresh && cachedToken) return cachedToken;
  if (fetching) return fetching;
  fetching = (async () => {
    try {
      const res = await fetch("/api/token");
      if (res.ok) {
        const data = await res.json();
        cachedToken = data.accessToken ?? null;
        return cachedToken;
      }
    } catch {
      // swallow
    } finally {
      fetching = null;
    }
    return null;
  })();
  return fetching;
}

export function clearCachedToken() {
  cachedToken = null;
}
