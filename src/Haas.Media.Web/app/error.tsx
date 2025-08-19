"use client";
import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("App error boundary captured:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 max-w-md">
          An unexpected error occurred while rendering this page. You can try again or return to the home page.
        </p>
        {error.digest && (
          <p className="mt-2 text-xs font-mono text-gray-400">Ref: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-4">
        <button
          onClick={() => reset()}
          className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          Try again
        </button>
        <a
          href="/"
            className="px-4 py-2 text-sm font-medium bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Home
        </a>
      </div>
    </div>
  );
}
