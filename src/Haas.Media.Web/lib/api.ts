import { getApiUrl as resolveApiUrl, getServerApiUrl } from "./env";

/**
 * Resolve the effective API base URL for the current runtime context.
 */
export function getApiUrl(): string {
  return resolveApiUrl();
}

/**
 * Resolve the API base URL as seen from the backend services.
 */
export { getServerApiUrl };

/**
 * Cached API base URL for convenience in modules that do not need
 * to recompute the value on each access.
 */
export const downloaderApi = getApiUrl();

/**
 * Join the supplied path to the API base URL.
 */
export function buildApiUrl(path: string): string {
  const baseUrl = getApiUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}
