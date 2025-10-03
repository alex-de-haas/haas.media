"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { LucideIcon } from "lucide-react";
import { CheckCircle2, X, XCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

export type NotificationType = "success" | "error";

export interface NotificationItem {
  id: string;
  title?: string;
  message: string;
  type?: NotificationType;
  /** milliseconds to auto dismiss. If 0/undefined => default. If -1 => persist */
  timeout?: number;
}

interface NotificationsContextValue {
  notify: (n: Omit<NotificationItem, "id"> & { id?: string }) => string; // returns id
  remove: (id: string) => void;
  clear: () => void;
}

const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined);

/** Default timeout (ms) */
const DEFAULT_TIMEOUT = 5000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const handle = timers.current.get(id);
    if (handle) {
      window.clearTimeout(handle);
      timers.current.delete(id);
    }
  }, []);

  const schedule = useCallback(
    (item: NotificationItem) => {
      const timeout = item.timeout ?? DEFAULT_TIMEOUT;
      if (timeout === -1 || timeout <= 0) return;
      const existing = timers.current.get(item.id);
      if (existing) {
        window.clearTimeout(existing);
      }
      const handle = window.setTimeout(() => remove(item.id), timeout);
      timers.current.set(item.id, handle);
    },
    [remove]
  );

  const notify: NotificationsContextValue["notify"] = useCallback(
    (n) => {
      const id = n.id ?? crypto.randomUUID();
      const item: NotificationItem = { id, type: "success", ...n };
      setItems((prev) => [
        ...prev.filter((existing) => existing.id !== id),
        item,
      ]);
      if (item.timeout !== -1) {
        schedule(item);
      }
      return id;
    },
    [schedule]
  );

  const clear = useCallback(() => {
    timers.current.forEach((handle) => window.clearTimeout(handle));
    timers.current.clear();
    setItems([]);
  }, []);

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((handle) => window.clearTimeout(handle));
      timersMap.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ notify, remove, clear }),
    [notify, remove, clear]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationsList items={items} onClose={remove} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotifications must be used within NotificationsProvider"
    );
  return ctx;
}

function NotificationsList({
  items,
  onClose,
}: {
  items: NotificationItem[];
  onClose: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed top-4 right-4 z-50 flex max-w-full flex-col gap-3 sm:right-6 sm:top-6">
      {items.map((item) => (
        <NotificationAlert
          key={item.id}
          item={item}
          onClose={() => onClose(item.id)}
        />
      ))}
    </div>
  );
}

type NotificationPresentation = {
  icon: LucideIcon;
  variant: "default" | "destructive";
  className?: string;
};

const presentationMap: Record<NotificationType, NotificationPresentation> = {
  success: {
    icon: CheckCircle2,
    variant: "default",
    className: "shadow-lg",
  },
  error: {
    icon: XCircle,
    variant: "destructive",
    className: "shadow-lg",
  },
};

function NotificationAlert({
  item,
  onClose,
}: {
  item: NotificationItem;
  onClose: () => void;
}) {
  const { type = "success", title, message } = item;
  const presentation = presentationMap[type];
  const Icon = presentation.icon;

  return (
    <Alert
      variant={presentation.variant}
      className={cn(
        "pointer-events-auto relative w-full max-w-sm overflow-hidden pr-10 transition-all",
        presentation.className
      )}
      aria-live="assertive"
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <div className="space-y-1">
        {title && <AlertTitle>{title}</AlertTitle>}
        <AlertDescription>{message}</AlertDescription>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </Alert>
  );
}
