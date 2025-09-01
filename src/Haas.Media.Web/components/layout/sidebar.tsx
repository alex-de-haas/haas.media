"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayout } from "./layout-provider";
import { useAuth } from "../../lib/hooks/useAuth";
import ThemeSwitch from "../ui/theme-switch";

interface SidebarProps {
  children?: React.ReactNode;
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    name: "Torrents",
    href: "/torrent",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    name: "Files",
    href: "/files",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25H11.69z" />
      </svg>
    ),
  },
  {
    name: "Libraries",
    href: "/libraries",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    name: "Encodings",
    href: "/encodings",
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5V18M15 7.5V18M3 16.811V8.69c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.953l-7.108 4.061A1.125 1.125 0 0 1 3 16.811Z" />
      </svg>
    ),
  },
];

export default function Sidebar({ children }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useLayout();
  const { user } = useAuth();

  return (
    <>
      {/* Mobile menu overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <div className="sticky top-0 z-50 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:gap-x-6 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 lg:hidden"
          onClick={() => setSidebarOpen(true)}
        >
          <span className="sr-only">Open sidebar</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          </svg>
        </button>
        <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 lg:hidden" />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 dark:border-gray-700 dark:bg-gray-800">
          <nav className="flex flex-1 flex-col pt-6">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors ${
                            isActive
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                              : "text-gray-700 hover:bg-gray-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                          }`}
                        >
                          <div
                            className={`${
                              isActive
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-gray-400 group-hover:text-blue-700 dark:text-gray-500 dark:group-hover:text-blue-400"
                            }`}
                          >
                            {item.icon}
                          </div>
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
          
          {/* Bottom section with theme switch and user info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
            {/* Theme Switch */}
            <div className="flex justify-center">
              <ThemeSwitch variant="buttons" size="sm" />
            </div>
            
            {/* User Info */}
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || user.email || "User avatar"}
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700"
                    />
                  )}
                  <div className="flex flex-col text-sm text-gray-700 dark:text-gray-200 min-w-0 flex-1">
                    <span className="font-medium truncate">{user.name}</span>
                    {user.email && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href="/api/auth/logout"
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div
        className={`relative z-50 lg:hidden ${
          sidebarOpen ? "block" : "hidden"
        }`}
      >
        <div className="fixed inset-y-0 left-0 z-50 w-72 overflow-y-auto bg-white px-6 pb-4 dark:bg-gray-800">
          <div className="flex h-16 shrink-0 items-center">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigationItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors ${
                            isActive
                              ? "bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400"
                              : "text-gray-700 hover:bg-gray-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-400"
                          }`}
                          onClick={() => setSidebarOpen(false)}
                        >
                          <div
                            className={`${
                              isActive
                                ? "text-blue-700 dark:text-blue-400"
                                : "text-gray-400 group-hover:text-blue-700 dark:text-gray-500 dark:group-hover:text-blue-400"
                            }`}
                          >
                            {item.icon}
                          </div>
                          {item.name}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            </ul>
          </nav>
          
          {/* Bottom section with theme switch and user info for mobile */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4 mt-4">
            {/* Theme Switch */}
            <div className="flex justify-center">
              <ThemeSwitch variant="buttons" size="sm" />
            </div>
            
            {/* User Info */}
            {user ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-2">
                  {user.picture && (
                    <img
                      src={user.picture}
                      alt={user.name || user.email || "User avatar"}
                      className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-700"
                    />
                  )}
                  <div className="flex flex-col text-sm text-gray-700 dark:text-gray-200 min-w-0 flex-1">
                    <span className="font-medium truncate">{user.name}</span>
                    {user.email && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href="/api/auth/logout"
                  className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors text-center"
                >
                  Logout
                </a>
              </div>
            ) : (
              <a
                href="/api/auth/login"
                className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors text-center"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </div>

      {children}
    </>
  );
}
