"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import clsx from "clsx";

export type NotificationType = "success" | "error" | "warning" | "info";

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

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

/** Default timeout (ms) */
const DEFAULT_TIMEOUT = 5000;

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timers = useRef<Map<string, number>>(new Map());

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const t = timers.current.get(id);
    if (t) {
      window.clearTimeout(t);
      timers.current.delete(id);
    }
  }, []);

  const schedule = useCallback((item: NotificationItem) => {
    const timeout = item.timeout == null ? DEFAULT_TIMEOUT : item.timeout;
    if (timeout <= 0) return; // 0 or negative (except -1) treated as persist if -1 else no auto
    const handle = window.setTimeout(() => remove(item.id), timeout);
    timers.current.set(item.id, handle);
  }, [remove]);

  const notify: NotificationsContextValue['notify'] = useCallback(n => {
    const id = n.id ?? crypto.randomUUID();
    const item: NotificationItem = { id, type: 'info', ...n };
    setItems(prev => [...prev, item]);
    if (item.timeout !== -1) schedule(item);
    return id;
  }, [schedule]);

  const clear = useCallback(() => {
    timers.current.forEach(h => window.clearTimeout(h));
    timers.current.clear();
    setItems([]);
  }, []);

  // Clean timers on unmount
  useEffect(() => () => {
    timers.current.forEach(h => window.clearTimeout(h));
    timers.current.clear();
  }, []);

  return (
    <NotificationsContext.Provider value={{ notify, remove, clear }}>
      {children}
      <NotificationsList items={items} onClose={remove} />
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
}

/* Tailwind alert component list (inspired by Creative Tim Alerts) */
function NotificationsList({ items, onClose }: { items: NotificationItem[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 pointer-events-none flex flex-col items-end gap-3 z-[100]">
      {items.map(item => (
        <Alert key={item.id} item={item} onClose={() => onClose(item.id)} />
      ))}
    </div>
  );
}

interface AlertProps { item: NotificationItem; onClose: () => void; }

function Alert({ item, onClose }: AlertProps) {
  const { type = 'info', title, message } = item;
  const base = "w-full max-w-sm pointer-events-auto shadow-lg border p-4 flex gap-3 animate-slide-in-right bg-white dark:bg-gray-800";
  const color = {
    success: "border-green-300 text-green-800 dark:text-green-300 bg-green-50 dark:bg-gray-800",
    error: "border-red-300 text-red-800 dark:text-red-300 bg-red-50 dark:bg-gray-800",
    warning: "border-yellow-300 text-yellow-800 dark:text-yellow-300 bg-yellow-50 dark:bg-gray-800",
    info: "border-blue-300 text-blue-800 dark:text-blue-300 bg-blue-50 dark:bg-gray-800"
  }[type];

  const icon = {
    success: (
      <svg className="h-5 w-5 text-green-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    ),
    error: (
      <svg className="h-5 w-5 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M4.293 4.293l15.414 15.414M19.707 4.293L4.293 19.707" /></svg>
    ),
    warning: (
      <svg className="h-5 w-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a1 1 0 00.86 1.5h18.64a1 1 0 00.86-1.5L13.71 3.86a1 1 0 00-1.72 0z" /></svg>
    ),
    info: (
      <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 3a9 9 0 110 18 9 9 0 010-18z" /></svg>
    )
  }[type];

  return (
    <div className={clsx(base, color)} role="alert" aria-live="assertive">
      <div className="shrink-0 pt-1">{icon}</div>
      <div className="flex-1 text-sm">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <p className="leading-snug">{message}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        aria-label="Close notification"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} fill="none"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// Basic animation utility classes; consumer can add to globals.css if not existing
// We'll inject a style tag once (idempotent)
let injected = false;
function ensureAnimationStyles() {
  if (typeof document === 'undefined' || injected) return;
  const style = document.createElement('style');
  style.textContent = `@keyframes slide-in-right {0%{opacity:0;transform:translateX(1rem)}100%{opacity:1;transform:translateX(0)}}.animate-slide-in-right{animation:slide-in-right .25s ease-out}`;
  document.head.appendChild(style);
  injected = true;
}
if (typeof window !== 'undefined') ensureAnimationStyles();
