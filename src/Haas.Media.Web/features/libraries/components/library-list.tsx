"use client";

import { useState } from "react";
import type { Library } from "@/types/library";
import { formatDate } from "@/lib/utils/format";
import { LoadingSpinner } from "@/components/ui";

interface LibraryListProps {
  libraries: Library[];
  onEdit: (library: Library) => void;
  onDelete: (library: Library) => void;
  loading?: boolean;
}

interface LibraryActionsProps {
  library: Library;
  onEdit: () => void;
  onDelete: () => void;
}

function LibraryActions({ library, onEdit, onDelete }: LibraryActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded dark:text-gray-400 dark:hover:text-gray-300"
        aria-label="Library actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {showActions && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 dark:bg-gray-800 dark:border-gray-700">
          <div className="py-1">
            <button
              onClick={() => {
                onEdit();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Edit
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LibraryIcon() {
  return (
    <svg
      className="w-5 h-5 text-blue-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
    </svg>
  );
}

export default function LibraryList({
  libraries,
  onEdit,
  onDelete,
  loading,
}: LibraryListProps) {
  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      {/* Library listing */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {libraries.length === 0 ? (
          <div className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
            <div className="flex flex-col items-center justify-center space-y-3">
              <svg
                className="w-16 h-16 text-gray-300 dark:text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                />
              </svg>
              <span className="text-sm">No libraries found</span>
            </div>
          </div>
        ) : (
          libraries.map((library) => (
            <div
              key={library.id}
              className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between dark:hover:bg-gray-700"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <LibraryIcon />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                    {library.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    <div className="flex flex-col gap-1">
                      <span className="truncate">{library.directoryPath}</span>
                      {library.description && (
                        <span className="truncate">{library.description}</span>
                      )}
                      <span>Created {formatDate(library.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <LibraryActions
                library={library}
                onEdit={() => onEdit(library)}
                onDelete={() => onDelete(library)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
