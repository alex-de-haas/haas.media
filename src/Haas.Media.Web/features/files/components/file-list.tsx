"use client";

import { useState } from "react";
import { FileItemType } from "@/types/file";
import type { FileItem } from "@/types/file";
import { formatFileSize, formatDate } from "@/lib/utils/format";
import Link from "next/link";
import { LoadingSpinner } from "@/components/ui";

interface FileListProps {
  files: FileItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onDelete: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  onRename: (item: FileItem) => void;
  loading?: boolean;
  showActions?: boolean;
}

interface FileActionsProps {
  item: FileItem;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
  onRename: () => void;
}

function FileActions({
  item,
  onDelete,
  onCopy,
  onMove,
  onRename,
}: FileActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded dark:text-gray-400 dark:hover:text-gray-300"
        aria-label="File actions"
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
                onCopy();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy
            </button>
            <button
              onClick={() => {
                onMove();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Move
            </button>
            <button
              onClick={() => {
                onRename();
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
              Rename
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

function FileIcon({ item }: { item: FileItem }) {
  if (item.type === FileItemType.Directory) {
    return (
      <svg
        className="w-5 h-5 text-blue-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }

  // File icon based on extension
  const extension = item.extension?.toLowerCase();
  if (
    extension &&
    ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)
  ) {
    return (
      <svg
        className="w-5 h-5 text-green-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (
    extension &&
    ["mp4", "avi", "mkv", "mov", "wmv", "flv", "webm"].includes(extension)
  ) {
    return (
      <svg
        className="w-5 h-5 text-purple-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 2v8l6-4-6-4z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  if (
    extension &&
    ["mp3", "wav", "flac", "aac", "ogg", "m4a"].includes(extension)
  ) {
    return (
      <svg
        className="w-5 h-5 text-red-500"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z"
          clipRule="evenodd"
        />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg
      className="w-5 h-5 text-gray-500"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path
        fillRule="evenodd"
        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function FileList({
  files,
  currentPath,
  onNavigate,
  onDelete,
  onCopy,
  onMove,
  onRename,
  loading,
  showActions = true,
}: FileListProps) {
  const pathParts = currentPath ? currentPath.split("/").filter(Boolean) : [];

  const handleItemClick = (item: FileItem) => {
    if (item.type === FileItemType.Directory) {
      onNavigate(item.relativePath);
    }
  };

  const navigateUp = () => {
    if (pathParts.length > 0) {
      const parentPath = pathParts.slice(0, -1).join("/");
      onNavigate(parentPath);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" />;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => onNavigate("")}
            className="text-blue-600 hover:text-blue-800 font-medium dark:text-blue-400 dark:hover:text-blue-300"
          >
            Files
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-400 dark:text-gray-600">/</span>
              <button
                onClick={() =>
                  onNavigate(pathParts.slice(0, index + 1).join("/"))
                }
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* File listing */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {/* Back button */}
        {currentPath && (
          <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
            <button
              onClick={navigateUp}
              className="flex items-center space-x-3 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Files and directories */}
        {files.length === 0 ? (
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6"
                  opacity={0.5}
                />
              </svg>
              <span className="text-sm">This directory is empty</span>
            </div>
          </div>
        ) : (
          files.map((item) => (
            <div
              key={item.relativePath}
              className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between dark:hover:bg-gray-700"
            >
              <div
                className={`flex items-center space-x-3 flex-1 min-w-0 ${
                  item.type === FileItemType.Directory ? "cursor-pointer" : ""
                }`}
                onClick={() => handleItemClick(item)}
              >
                <FileIcon item={item} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate dark:text-gray-100">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 dark:text-gray-400">
                    {item.type === FileItemType.Directory ? (
                      "Directory"
                    ) : (
                      <span className="flex space-x-2">
                        <span>{formatFileSize(item.size || 0)}</span>
                        <span>•</span>
                        <span>{formatDate(item.lastModified)}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {item.type === FileItemType.Media && (
                <Link
                  prefetch={false}
                  href={`/media-info/${encodeURIComponent(item.relativePath)}`}
                  className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  aria-label="Media info"
                >
                  <svg
                    className="w-5 h-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    {/* Circular arrow to indicate encoding/processing */}
                    <path d="M21 12a9 9 0 11-3-6.5" />
                    <path d="M21 12v-4h-4" />

                    {/* Play triangle to indicate media */}
                    <polygon
                      points="8,7 14,11 8,15"
                      fill="currentColor"
                      stroke="none"
                    />
                  </svg>
                  <span className="sr-only">Media Info</span>
                </Link>
              )}
              {showActions && (
                <FileActions
                  item={item}
                  onDelete={() => onDelete(item)}
                  onCopy={() => onCopy(item)}
                  onMove={() => onMove(item)}
                  onRename={() => onRename(item)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
