"use client";

import { useState } from "react";
import type { FileItem } from "@/types/file";
import { formatFileSize, formatDate } from "@/lib/utils/format";

interface FileListProps {
  files: FileItem[];
  currentPath: string;
  onNavigate: (path: string) => void;
  onDelete: (item: FileItem) => void;
  onCopy: (item: FileItem) => void;
  onMove: (item: FileItem) => void;
  loading?: boolean;
}

interface FileActionsProps {
  item: FileItem;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
}

function FileActions({ item, onDelete, onCopy, onMove }: FileActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        aria-label="File actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>
      
      {showActions && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onCopy();
                setShowActions(false);
              }}
              className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
            >
              Copy
            </button>
            <button
              onClick={() => {
                onMove();
                setShowActions(false);
              }}
              className="block w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100"
            >
              Move
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowActions(false);
              }}
              className="block w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FileIcon({ item }: { item: FileItem }) {
  if (item.isDirectory) {
    return (
      <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    );
  }

  // File icon based on extension
  const extension = item.extension?.toLowerCase();
  if (extension && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
    return (
      <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    );
  }

  if (extension && ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
    return (
      <svg className="w-5 h-5 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm3 2v8l6-4-6-4z" clipRule="evenodd" />
      </svg>
    );
  }

  if (extension && ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(extension)) {
    return (
      <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
      </svg>
    );
  }

  // Default file icon
  return (
    <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  );
}

export default function FileList({ files, currentPath, onNavigate, onDelete, onCopy, onMove, loading }: FileListProps) {
  const pathParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  const handleItemClick = (item: FileItem) => {
    if (item.isDirectory) {
      onNavigate(item.relativePath);
    }
  };

  const navigateUp = () => {
    if (pathParts.length > 0) {
      const parentPath = pathParts.slice(0, -1).join('/');
      onNavigate(parentPath);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading files...</div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Breadcrumb */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-2 text-sm">
          <button
            onClick={() => onNavigate("")}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Files
          </button>
          {pathParts.map((part, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span className="text-gray-400">/</span>
              <button
                onClick={() => onNavigate(pathParts.slice(0, index + 1).join('/'))}
                className="text-blue-600 hover:text-blue-800"
              >
                {part}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* File listing */}
      <div className="divide-y divide-gray-200">
        {/* Back button */}
        {currentPath && (
          <div className="px-4 py-3 hover:bg-gray-50">
            <button
              onClick={navigateUp}
              className="flex items-center space-x-3 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Back</span>
            </button>
          </div>
        )}

        {/* Files and directories */}
        {files.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500">
            This directory is empty
          </div>
        ) : (
          files.map((item) => (
            <div
              key={item.relativePath}
              className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between"
            >
              <div
                className={`flex items-center space-x-3 flex-1 min-w-0 ${
                  item.isDirectory ? 'cursor-pointer' : ''
                }`}
                onClick={() => handleItemClick(item)}
              >
                <FileIcon item={item} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.isDirectory ? (
                      'Directory'
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
              <FileActions
                item={item}
                onDelete={() => onDelete(item)}
                onCopy={() => onCopy(item)}
                onMove={() => onMove(item)}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
