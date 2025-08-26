"use client";

import { ReactNode, useEffect } from "react";
import { useLayout } from "./layout-provider";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{
    name: string;
    href?: string;
    current?: boolean;
  }>;
}

export default function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  const { setPageTitle } = useLayout();

  // Update the page title in the layout context
  useEffect(() => {
    setPageTitle(title);
  }, [title, setPageTitle]);

  return (
    <div className="pb-4">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-4" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2 text-sm">
            {breadcrumbs.map((breadcrumb, index) => (
              <li key={breadcrumb.name} className="flex items-center">
                {index > 0 && (
                  <svg
                    className="mx-2 h-3 w-3 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                )}
                {breadcrumb.href && !breadcrumb.current ? (
                  <a
                    href={breadcrumb.href}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  >
                    {breadcrumb.name}
                  </a>
                ) : (
                  <span
                    className={`${
                      breadcrumb.current
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-400"
                    }`}
                  >
                    {breadcrumb.name}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Header content */}
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:truncate sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-x-4">
          {/* Custom Actions */}
          {actions}
        </div>
      </div>
    </div>
  );
}
