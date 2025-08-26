"use client";

import { useState } from "react";
import type { FileItem, CopyFileRequest, MoveFileRequest } from "@/types/file";

interface CopyMoveModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: "copy" | "move";
  item: FileItem;
  onConfirm: (data: CopyFileRequest | MoveFileRequest) => Promise<{ success: boolean; message: string }>;
}

export default function CopyMoveModal({
  isOpen,
  onClose,
  action,
  item,
  onConfirm,
}: CopyMoveModalProps) {
  const [destinationPath, setDestinationPath] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationPath.trim()) return;

    setLoading(true);

    try {
      const data = {
        sourcePath: item.relativePath,
        destinationPath: destinationPath.trim(),
      };

      const result = await onConfirm(data);
      if (result?.success) {
        onClose();
        setDestinationPath("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDestinationPath("");
  };

  const actionTitle = action === "copy" ? "Copy" : "Move";
  const actionVerb = action === "copy" ? "copying" : "moving";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {actionTitle} {item.name}
            </h3>
          </div>
          
          <div className="px-6 py-4">
            <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">
              Destination Path
            </label>
            <input
              id="destination"
              type="text"
              value={destinationPath}
              onChange={(e) => setDestinationPath(e.target.value)}
              placeholder={`Enter destination path for ${item.name}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
              required
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Current location: {item.relativePath}
            </p>
            {action === "move" && (
              <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-md p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Note:</strong> Moving will remove the file from its current location.
                </p>
              </div>
            )}
          </div>
          
          <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !destinationPath.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            >
              {loading ? `${actionTitle.charAt(0).toUpperCase() + actionVerb.slice(1)}...` : actionTitle}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
