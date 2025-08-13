/**
 * Lightweight helpers around the Browser Notification API.
 * Client-only usage. Always guard with isSupported() in SSR contexts.
 */

export function isSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPermission(): NotificationPermission | "unsupported" {
  if (!isSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isSupported()) return "unsupported";
  // If already decided, just return it
  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    // Older Safari versions may throw on user gesture issues
    return Notification.permission;
  }
}

export interface ShowNotificationOptions extends NotificationOptions {
  /**
   * If true, attempt to keep the notification on screen until user interacts (may be ignored by the browser)
   */
  requireInteraction?: boolean;
  /**
   * Reuse the notification tag and re-alert the user (mainly used in service worker contexts; some browsers may ignore in window context)
   */
  renotify?: boolean;
}

/**
 * Show a browser notification if supported and permission granted.
 * Returns the Notification instance or null if not shown.
 */
export function showNotification(title: string, options?: ShowNotificationOptions): Notification | null {
  if (!isSupported() || Notification.permission !== "granted") return null;
  try {
    // Use favicon as default icon if none provided
    const withDefaults: NotificationOptions = {
      icon: "/favicon.ico",
      ...options,
    };
    const n = new Notification(title, withDefaults);
    return n;
  } catch {
    return null;
  }
}
