"use client";

import { useCallback, useEffect, useState } from "react";
import { getPermission, isSupported, requestPermission, showNotification, type ShowNotificationOptions } from "../notifications";

export interface UseBrowserNotifications {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  request: () => Promise<NotificationPermission | "unsupported">;
  notify: (title: string, options?: ShowNotificationOptions) => Notification | null;
}

export function useBrowserNotifications(): UseBrowserNotifications {
  // Initialize SSR-safe defaults so server and first client render match
  const [supported, setSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    // Compute browser-dependent values after mount to avoid hydration mismatch
    setSupported(isSupported());
    setPermission(getPermission());
  }, []);

  const request = useCallback(async () => {
    const p = await requestPermission();
    setPermission(p);
    return p;
  }, []);

  const notify = useCallback((title: string, options?: ShowNotificationOptions) => {
    return showNotification(title, options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, permission, request, notify };
}
