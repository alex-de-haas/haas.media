"use client";

import { useState } from "react";
import type { CreateDirectoryRequest } from "@/types/file";

interface CreateDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPath: string;
  onConfirm: (data: CreateDirectoryRequest) => Promise<{ success: boolean; message: string }>;
}

export default function CreateDirectoryModal({
  isOpen,
  onClose,
  currentPath,
  onConfirm,
}: CreateDirectoryModalProps) {
  const [directoryName, setDirectoryName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directoryName.trim()) return;

    setLoading(true);

    try {
      const newPath = currentPath ? `${currentPath}/${directoryName}` : directoryName;
      const result = await onConfirm({
        path: newPath,
      });

      if (result?.success) {
        onClose();
        setDirectoryName("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDirectoryName("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Create Directory
            </h3>
          </div>
          
          <div className="px-6 py-4">
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
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Will be created in: {currentPath || "root"}
            </p>
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
              disabled={loading || !directoryName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:focus:ring-offset-gray-800"
            >
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
