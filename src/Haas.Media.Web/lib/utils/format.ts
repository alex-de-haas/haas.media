/**
 * Formats bytes to human readable format
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Alias for formatSize for file size formatting
 */
export const formatFileSize = formatSize;

/**
 * Formats a number to a human readable rate format (e.g., "1.2 MB/s")
 */
export function formatRate(bytesPerSecond: number): string {
  return `${formatSize(bytesPerSecond)}/s`;
}

/**
 * Formats a percentage with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Formats a duration in seconds to h:mm:ss or m:ss
 */
export function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const secs = Math.round(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}

/**
 * Formats a date to a human readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
