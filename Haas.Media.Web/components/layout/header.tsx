"use client";

import Link from "next/link";
import { useTheme } from "../../lib/hooks/useTheme";
import { useBrowserNotifications } from "../../lib/hooks/useBrowserNotifications";

interface HeaderProps {
  children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const { theme, setThemeMode } = useTheme();
  const { supported, permission, request, notify } = useBrowserNotifications();

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800 dark:text-blue-400 hover:dark:text-blue-300 transition-colors"
            aria-label="Go to Haas Media Server home"
          >
            <svg
              className="h-8 w-8"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
            </svg>
            <span className="text-xl font-semibold">
              Haas Media Server
            </span>
          </Link>

          {/* Search (optional placeholder) */}
          <div className="hidden md:flex flex-1 justify-center px-4">
            <div className="w-full max-w-md">
              <label htmlFor="search" className="sr-only">
                Search
              </label>
              <div className="relative">
                <input
                  id="search"
                  name="search"
                  type="search"
                  placeholder="Search…"
                  className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-3 pr-3 text-sm placeholder-gray-400 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            {supported && (
              <button
                type="button"
                onClick={async () => {
                  const p = await request();
                  if (p === "granted") {
                    notify("Notifications enabled", {
                      body: "You'll get updates even when this tab is in the background.",
                      renotify: true,
                    });
                  }
                }}
                className="px-3 py-2 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                aria-label="Enable browser notifications"
                title={
                  permission === "granted"
                    ? "Notifications are enabled"
                    : permission === "denied"
                      ? "Notifications are blocked in your browser settings"
                      : "Click to enable browser notifications"
                }
                disabled={permission === "denied"}
              >
                {permission === "granted" ? "Notifications On" : permission === "denied" ? "Notifications Blocked" : "Enable Notifications"}
              </button>
            )}
            <div>
              <div
                className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden"
                role="group"
                aria-label="Theme switch"
              >
                <button
                  type="button"
                  onClick={() => setThemeMode("light")}
                  className={`px-3 py-2 text-sm font-medium ${
                    theme === "light"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  } border-r border-gray-300 dark:border-gray-600`}
                >
                  Light
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode("dark")}
                  className={`px-3 py-2 text-sm font-medium ${
                    theme === "dark"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  } border-r border-gray-300 dark:border-gray-600`}
                >
                  Dark
                </button>
                <button
                  type="button"
                  onClick={() => setThemeMode("system")}
                  className={`px-3 py-2 text-sm font-medium ${
                    theme === "system"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  System
                </button>
              </div>
            </div>
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700">
              Login
            </button>
          </div>
        </div>
      </div>

      {/* Secondary bar */}
      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-6">
            <div className="relative group">
              <button className="text-blue-600 dark:text-blue-300 hover:underline font-medium px-2 py-1 focus:outline-none flex items-center">
                Upload
                <svg
                  className="ml-2 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div className="absolute mt-2 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <Link
                  href="/torrent-upload"
                  className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300"
                >
                  Torrent
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
