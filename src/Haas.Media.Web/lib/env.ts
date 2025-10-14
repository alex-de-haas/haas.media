import { env } from "next-runtime-env";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function resolveCandidateUrl(value: string | undefined | null): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimTrailingSlash(trimmed) : undefined;
}

function buildExclusionSet(): Set<string> {
  const exclusions = new Set<string>();

  const candidates =
    typeof window === "undefined"
      ? [resolveCandidateUrl(env("WEB_BASE_URL")), resolveCandidateUrl(process.env.WEB_BASE_URL)]
      : [resolveCandidateUrl(process.env.WEB_BASE_URL)];

  for (const candidate of candidates) {
    if (candidate) {
      exclusions.add(candidate);
    }
  }

  return exclusions;
}

function pickFirstUrl(candidates: Array<string | undefined>, excluded: Set<string>): string | undefined {
  for (const candidate of candidates) {
    if (candidate && !excluded.has(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

export function getServerApiUrl(): string {
  const excluded = buildExclusionSet();

  const preferred = pickFirstUrl(
    [
      resolveCandidateUrl(env("INTERNAL_API_BASE_URL")),
      resolveCandidateUrl(process.env.INTERNAL_API_BASE_URL),
      resolveCandidateUrl(env("API_BASE_URL")),
      resolveCandidateUrl(process.env.API_BASE_URL),
    ],
    excluded,
  );

  if (preferred) {
    return preferred;
  }

  const fallback = pickFirstUrl(
    [
      resolveCandidateUrl(env("NEXT_PUBLIC_API_BASE_URL")),
      resolveCandidateUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
    ],
    excluded,
  );

  return fallback ?? "http://localhost:8000";
}

/**
 * Get the API URL from runtime environment variables
 */
export function getApiUrl(): string {
  const excluded = buildExclusionSet();
  const publicApiUrl = pickFirstUrl(
    [
      resolveCandidateUrl(env("NEXT_PUBLIC_API_BASE_URL")),
      resolveCandidateUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
    ],
    excluded,
  );

  if (typeof window !== "undefined") {
    return publicApiUrl ?? "http://localhost:8000";
  }

  return getServerApiUrl();
}
