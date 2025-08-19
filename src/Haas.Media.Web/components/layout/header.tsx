"use client";

import Link from "next/link";
import { useTheme } from "../../lib/hooks/useTheme";
import { useNotifications } from "../../lib/notifications";
import { useEffect, useState } from "react";

interface HeaderProps {
  children?: React.ReactNode;
}

export default function Header({ children }: HeaderProps) {
  const { theme, setThemeMode } = useTheme();
  const { notify } = useNotifications();
  const [user, setUser] = useState<{
    name?: string;
    email?: string;
    picture?: string;
  } | null>(null);

  async function loadUser() {
    const res = await fetch("/api/auth/me");
    if (res.ok) {
      const data = await res.json();
      setUser(data || null);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

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
            <span className="text-xl font-semibold">Haas Media Server</span>
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <div>
              <div
                className="inline-flex shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden"
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
            {user ? (
              <div className="flex items-center gap-3">
                {user.picture && (
                  <img
                    src={user.picture}
                    alt={user.name || user.email || "User avatar"}
                    className="w-8 h-8 border border-gray-300 dark:border-gray-700"
                  />
                )}
                <div className="flex flex-col text-sm text-gray-700 dark:text-gray-200">
                  <span className="font-medium">{user.name}</span>
                  {user.email && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </span>
                  )}
                </div>
                <a
                  href="/api/auth/logout"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Secondary bar */}
      <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-12 items-center gap-6">
            <div className="relative group">
              <Link
                href="/torrent"
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300"
              >
                Torrents
              </Link>
            </div>
            <div className="relative group">
              <Link
                href="/encodings"
                className="block px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-blue-300"
              >
                Encodings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
