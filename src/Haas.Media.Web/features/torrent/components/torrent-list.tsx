"use client";

import React from "react"; // Add React import
import { TorrentState, type TorrentInfo } from "../../../types";
import { TorrentFile } from "../../../types/torrent"; // Import TorrentFile
import {
  formatSize,
  formatRate,
  formatPercentage,
} from "../../../lib/utils/format";

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
          <a
            href={`/torrent/file?hash=${encodeURIComponent(torrent.hash)}`}
            className="p-1 text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded text-xs"
            aria-label={`View media info for ${torrent.name}`}
            title="View media info"
          >
            Media Info
          </a>
          {/* Start/Stop buttons */}
          {isRunning ? (
            <>
              {onStop && (
                <button
                  onClick={onStop}
                  className="p-1 text-orange-600 hover:text-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded"
                  aria-label={`Stop ${torrent.name}`}
                  title="Stop torrent"
                >
                  Stop
                </button>
              )}
            </>
          ) : (
            onStart && (
              <button
                onClick={onStart}
                className="p-1 text-green-600 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded"
                aria-label={`Start ${torrent.name}`}
                title="Start torrent"
              >
                Start
              </button>
            )
          )}

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label={`Delete ${torrent.name}`}
              title="Delete torrent"
            >
              Delete
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
              <li key={file.path} className="flex justify-between items-center gap-2">
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
