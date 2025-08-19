"use client";

import React from "react"; // Add React import
import { TorrentState, type TorrentInfo } from "../../../types";
import { TorrentFile } from "../../../types/torrent"; // Import TorrentFile
import {
  formatSize,
  formatRate,
  formatPercentage,
} from "../../../lib/utils/format";
import Link from "next/link";

interface TorrentListProps {
  torrents: TorrentInfo[];
  onDelete?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onStart?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onStop?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onPause?: (hash: string) => Promise<{ success: boolean; message: string }>;
}

export default function TorrentList({
  torrents,
  onDelete,
  onStart,
  onStop,
}: TorrentListProps) {
  const handleDelete = async (hash: string, name: string) => {
    if (!onDelete) return;

    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      const result = await onDelete(hash);
      // Handle result if needed (notifications will be handled by the parent component)
    }
  };

  const handleStart = async (hash: string) => {
    if (!onStart) return;
    await onStart(hash);
  };

  const handleStop = async (hash: string) => {
    if (!onStop) return;
    await onStop(hash);
  };

  if (torrents.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
          No torrents
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Upload a torrent file to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
        Active Torrents ({torrents.length})
      </h2>

      <div className="space-y-3">
        {torrents.map((torrent) => (
          <TorrentCard
            key={torrent.hash}
            torrent={torrent}
            onDelete={
              onDelete
                ? () => handleDelete(torrent.hash, torrent.name)
                : undefined
            }
            onStart={onStart ? () => handleStart(torrent.hash) : undefined}
            onStop={onStop ? () => handleStop(torrent.hash) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface TorrentCardProps {
  torrent: TorrentInfo;
  onDelete?: (() => Promise<void>) | undefined;
  onStart?: (() => Promise<void>) | undefined;
  onStop?: (() => Promise<void>) | undefined;
}

function TorrentCard({ torrent, onDelete, onStart, onStop }: TorrentCardProps) {
  const isRunning =
    torrent.state === TorrentState.Downloading ||
    torrent.state === TorrentState.Seeding;

  const [showFiles, setShowFiles] = React.useState(false);
  // Media info now shown on dedicated page; keep only file toggle

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {torrent.name}
          </h3>
          <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span>
              {formatSize(torrent.downloaded)} from {formatSize(torrent.size)}
            </span>
            <span>•</span>
            <span>{formatPercentage(torrent.progress)} complete</span>
            <span>•</span>
            <span
              className={
                isRunning
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }
            >
              {isRunning ? "Running" : "Stopped"}
            </span>
          </div>
        </div>

        <div className="ml-4 flex items-center space-x-2">
          {torrent.progress >= 100 ? (
            <Link
              prefetch={false}
              href={`/torrent/${encodeURIComponent(torrent.hash)}`}
              className="p-1 text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
              aria-label={`View media info for ${torrent.name}`}
              title="View media info"
            >
              <span className="sr-only">Media Info</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                />
              </svg>
            </Link>
          ) : null}
          {isRunning
            ? onStop && (
                <button
                  onClick={onStop}
                  className="p-1 text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                  aria-label={`Stop ${torrent.name}`}
                  title="Stop torrent"
                >
                  <span className="sr-only">Stop</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                </button>
              )
            : onStart && (
                <button
                  onClick={onStart}
                  className="p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                  aria-label={`Start ${torrent.name}`}
                  title="Start torrent"
                >
                  <span className="sr-only">Start</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5 3.868a1 1 0 011.52-.853l12 8.132a1 1 0 010 1.706l-12 8.132A1 1 0 015 20.132V3.868z" />
                  </svg>
                </button>
              )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label={`Delete ${torrent.name}`}
              title="Delete torrent"
            >
              <span className="sr-only">Delete</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>Progress</span>
          <span>{formatPercentage(torrent.progress)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${torrent.progress}%` }}
          />
        </div>
      </div>

      {/* Hash */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Hash: <span className="font-mono">{torrent.hash}</span>
        </div>
      </div>

      {/* Files List */}
      <div className="mt-3">
        <button
          onClick={() => setShowFiles(!showFiles)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
        >
          {showFiles ? "Hide Files" : "Show Files"}
        </button>

        {showFiles && (
          <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
            {torrent.files.map((file: TorrentFile) => (
              <li
                key={file.path}
                className="flex justify-between items-center gap-2"
              >
                <div className="flex-1 min-w-0">
                  <span className="truncate block" title={file.path}>
                    {file.path}
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatSize(file.downloaded)} / {formatSize(file.size)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
