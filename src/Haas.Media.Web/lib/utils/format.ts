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
 * Formats a number to a human readable rate format (e.g., "1.2 MB/s")
 */
export function formatRate(bytesPerSecond: number): string {
  return `${formatSize(bytesPerSecond)}/s`;
}

/**
 * Formats a percentage with one decimal place
 */
export function formatPercentage(value: number): string {
  return `${(value).toFixed(1)}%`;
}
