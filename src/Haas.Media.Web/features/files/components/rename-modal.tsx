"use client";

import { useState } from "react";
import { FileItemType } from "@/types/file";
import type { FileItem, RenameRequest } from "@/types/file";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FileItem;
  onConfirm: (data: RenameRequest) => Promise<{ success: boolean; message: string }>;
}

export default function RenameModal({
  isOpen,
  onClose,
  item,
  onConfirm,
}: RenameModalProps) {
  const [newName, setNewName] = useState(item.name);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newName.trim() === item.name) {
      onClose();
      return;
    }

    if (!newName.trim()) {
      return;
    }

    setLoading(true);
    try {
      const result = await onConfirm({
        path: item.relativePath,
        newName: newName.trim(),
      });
      
      if (result.success) {
        onClose();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNewName(item.name);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 dark:bg-gray-800">
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              Rename {item.type === FileItemType.Directory ? 'Directory' : 'File'}
            </h3>
          </div>
          
          <div className="px-6 py-4">
            <div>
              <label htmlFor="newName" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
                New name
              </label>
              <input
                id="newName"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:focus:ring-blue-500 dark:focus:border-blue-500"
                placeholder={`Enter new ${item.type === FileItemType.Directory ? 'directory' : 'file'} name`}
                disabled={loading}
                autoFocus
                required
              />
            </div>
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
              disabled={loading || !newName.trim() || newName.trim() === item.name}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-500 dark:focus:ring-offset-gray-800"
            >
              {loading ? "Renaming..." : "Rename"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
