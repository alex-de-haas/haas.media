"use client";

import { useState, useEffect } from "react";
import { useFiles } from "@/features/files";
import FileList from "@/features/files/components/file-list";
import type { Library, CreateLibraryRequest, UpdateLibraryRequest } from "@/types/library";
import { LibraryType } from "@/types/library";
import type { FileItem } from "@/types/file";
import { FileItemType } from "@/types/file";

interface LibraryFormProps {
  library?: Library;
  onSubmit: (data: CreateLibraryRequest | UpdateLibraryRequest) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function LibraryForm({
  library,
  onSubmit,
  onCancel,
  isLoading,
}: LibraryFormProps) {
  const [title, setTitle] = useState(library?.title || "");
  const [description, setDescription] = useState(library?.description || "");
  const [selectedPath, setSelectedPath] = useState(library?.directoryPath || "");
  const [libraryType, setLibraryType] = useState<LibraryType>(library?.type || LibraryType.Movies);
  const [showDirectoryPicker, setShowDirectoryPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const {
    files,
    currentPath,
    loading: filesLoading,
    navigateToPath,
  } = useFiles("");

  useEffect(() => {
    if (library) {
      setTitle(library.title);
      setDescription(library.description || "");
      setSelectedPath(library.directoryPath);
      setLibraryType(library.type);
    }
  }, [library]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedPath.trim()) return;

    setIsSubmitting(true);
    try {
      const data = {
        type: libraryType,
        title: title.trim(),
        directoryPath: selectedPath.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      };
      await onSubmit(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDirectorySelect = (item: FileItem) => {
    if (item.type === FileItemType.Directory) {
      setSelectedPath(item.relativePath);
      setShowDirectoryPicker(false);
    }
  };

  const openDirectoryPicker = () => {
    setShowDirectoryPicker(true);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 dark:bg-gray-800 dark:border-gray-700">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
        {library ? "Edit Library" : "Create New Library"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Enter library title"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Description (Optional)
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm resize-vertical focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
            placeholder="Enter library description"
          />
        </div>

        <div>
          <label
            htmlFor="directoryPath"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Directory Path
          </label>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              id="directoryPath"
              value={selectedPath}
              onChange={(e) => setSelectedPath(e.target.value)}
              required
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500"
              placeholder="Enter directory path or use the picker"
            />
            <button
              type="button"
              onClick={openDirectoryPicker}
              className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
            >
              Browse
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="libraryType"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Library Type
          </label>
          <select
            id="libraryType"
            value={libraryType}
            onChange={(e) => setLibraryType(Number(e.target.value) as LibraryType)}
            required
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100"
          >
            <option value={LibraryType.Movies}>Movies</option>
            <option value={LibraryType.TVShows}>TV Shows</option>
          </select>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !selectedPath.trim() || isSubmitting || isLoading}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || isLoading ? "Saving..." : (library ? "Update" : "Create")}
          </button>
        </div>
      </form>

      {/* Directory Picker Modal */}
      {showDirectoryPicker && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden dark:bg-gray-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Select Directory
                </h3>
                <button
                  onClick={() => setShowDirectoryPicker(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <FileList
                files={files.filter(file => file.type === FileItemType.Directory)}
                currentPath={currentPath}
                onNavigate={navigateToPath}
                loading={filesLoading}
              />
              {currentPath && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-900/20 dark:border-blue-800">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      Current path: {currentPath}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPath(currentPath);
                        setShowDirectoryPicker(false);
                      }}
                      className="px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Select This Directory
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
