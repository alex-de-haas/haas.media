import type { MediaInfo } from "./media-info";

// Mirrors backend MediaFileInfo record (Files/MediaFileInfo.cs)
export interface MediaFileInfo {
  name: string;
  relativePath: string;
  size: number;
  lastModified: string; // ISO string from DateTimeOffset
  extension: string;
  mediaInfo?: MediaInfo | null;
}

export function isMediaFileInfo(value: unknown): value is MediaFileInfo {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return (
    typeof v.name === "string" &&
    typeof v.relativePath === "string" &&
    typeof v.size === "number" &&
    typeof v.lastModified === "string" &&
    typeof v.extension === "string"
  );
}

export function isMediaFileInfoArray(value: unknown): value is MediaFileInfo[] {
  return Array.isArray(value) && value.every(isMediaFileInfo);
}
