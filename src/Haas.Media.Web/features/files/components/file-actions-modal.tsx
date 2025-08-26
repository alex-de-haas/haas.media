"use client";

import { useState } from "react";
import type { FileItem, CopyFileRequest, MoveFileRequest, CreateDirectoryRequest } from "@/types/file";

interface FileActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move" | "delete" | "create-directory" | null;
  item?: FileItem;
  currentPath: string;
  onConfirm: (data: any) => Promise<{ success: boolean; message: string }>;
}

export default function FileActionsModal({
  isOpen,
  onClose,
  action,
  item,
  currentPath,
  onConfirm,
}: FileActionsModalProps) {
  const [destinationPath, setDestinationPath] = useState("");
  const [directoryName, setDirectoryName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !action) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let result;
      switch (action) {
        case "copy":
          if (!item) return;
          result = await onConfirm({
            sourcePath: item.relativePath,
            destinationPath: destinationPath,
          } as CopyFileRequest);
          break;
        case "move":
          if (!item) return;
          result = await onConfirm({
            sourcePath: item.relativePath,
            destinationPath: destinationPath,
          } as MoveFileRequest);
          break;
        case "delete":
          result = await onConfirm(item?.relativePath);
          break;
        case "create-directory":
          const newPath = currentPath ? `${currentPath}/${directoryName}` : directoryName;
          result = await onConfirm({
            path: newPath,
          } as CreateDirectoryRequest);
          break;
      }

      if (result?.success) {
        onClose();
        setDestinationPath("");
        setDirectoryName("");
      }
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (action) {
      case "copy":
        return `Copy ${item?.name}`;
      case "move":
        return `Move ${item?.name}`;
      case "delete":
        return `Delete ${item?.name}`;
      case "create-directory":
        return "Create Directory";
      default:
        return "";
    }
  };

  const getContent = () => {
    switch (action) {
      case "copy":
      case "move":
        return (
          <div>
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Destination Path
            </label>
            <input
              id="destination"
              type="text"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              placeholder={`Enter destination path for ${item?.name}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Current location: {item?.relativePath}
            </p>
          </div>
        );
      case "delete":
        return (
          <div>
            <p className="text-sm text-gray-700 mb-4 dark:text-gray-300">
              Are you sure you want to delete <strong>{item?.name}</strong>?
              {item?.isDirectory && " This will delete the directory and all its contents."}
            </p>
            <div className="bg-red-50 border border-red-200 rounded-md p-3 dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">
                <strong>Warning:</strong> This action cannot be undone.
              </p>
            </div>
          </div>
        );
      case "create-directory":
        return (
          <div>
            <label htmlFor="directoryName" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Directory Name
            </label>
            <input
              id="directoryName"
              type="text"
              value={directoryName}
              onChange={(e) => setDirectoryName(e.target.value)}
              placeholder="Enter directory name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              required
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Will be created in: {currentPath || "root"}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">{getTitle()}</h3>
          </div>
          
          <div className="px-6 py-4">
            {getContent()}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800 ${
                action === "delete"
                  ? "bg-red-600 hover:bg-red-700 focus:ring-red-500"
                  : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              }`}
            >
              {loading ? "Processing..." : action === "delete" ? "Delete" : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
