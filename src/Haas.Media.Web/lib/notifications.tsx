"use client";

import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface NotificationItem {
  id?: string;
  title?: string;
  message: string;
  type?: NotificationType;
  /** milliseconds to auto dismiss. If 0/undefined => default. If -1 => persist */
  timeout?: number;
}

interface NotificationsContextValue {
  notify: (n: NotificationItem) => string | number; // returns toast id
  remove: (id: string | number) => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const notify: NotificationsContextValue["notify"] = useCallback((n: NotificationItem) => {
    const { title, message, type = "success", timeout } = n;
    
    const options = {
      description: title ? message : undefined,
      duration: timeout === -1 ? Infinity : timeout || 5000,
    };

    const displayMessage = title || message;
    
    switch (type) {
      case "error":
        return toast.error(displayMessage, options);
      case "warning":
        return toast.warning(displayMessage, options);
      case "info":
        return toast.info(displayMessage, options);
      case "success":
      default:
        return toast.success(displayMessage, options);
    }
  }, []);

  const remove = useCallback((id: string | number) => {
    toast.dismiss(id);
  }, []);

  const clear = useCallback(() => {
    toast.dismiss();
  }, []);

  const value = useMemo(() => ({ notify, remove, clear }), [notify, remove, clear]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <Toaster />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
