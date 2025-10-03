import { env } from "next-runtime-env";

/**
 * Get the API downloader URL from runtime environment variables
 */
export function getApiDownloaderUrl(): string | undefined {
  return env("NEXT_PUBLIC_API_DOWNLOADER_URL");
}
