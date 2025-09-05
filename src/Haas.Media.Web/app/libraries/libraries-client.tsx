"use client";

import { useState } from "react";
import { useLibraries, LibraryList, LibraryForm } from "@/features/libraries";
import { useNotifications } from "@/lib/notifications";
import {
  useMetadataSignalR,
  type ScanOperationInfo,
} from "@/lib/signalr/useMetadataSignalR";
import { PageHeader } from "@/components/layout";
import type { Library } from "@/types/library";

export default function LibrariesClient() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Library | null>(
    null
  );

  const {
    libraries,
    loading,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    startBackgroundScan,
    cancelScanOperation,
  } = useLibraries();

  const { notify } = useNotifications();
  const { scanOperations, isConnected } = useMetadataSignalR();

  // Get the current active scan operation
  const activeScanOperation = scanOperations.find(
    (op) => op.state === "Running"
  );

  const handleCreateLibrary = async (data: any) => {
    const result = await createLibrary(data);
    notify({
      title: result.success ? "Library Created" : "Create Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      setShowCreateForm(false);
    }
  };

  const handleUpdateLibrary = async (data: any) => {
    if (!editingLibrary?.id) return;

    const result = await updateLibrary(editingLibrary.id, data);
    notify({
      title: result.success ? "Library Updated" : "Update Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      setEditingLibrary(null);
    }
  };

  const handleDeleteLibrary = async (library: Library) => {
    if (!library.id) return;

    const result = await deleteLibrary(library.id);
    notify({
      title: result.success ? "Library Deleted" : "Delete Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    if (result.success) {
      setShowDeleteConfirm(null);
    }
  };

  const openCreateForm = () => {
    setShowCreateForm(true);
    setEditingLibrary(null);
  };

  const openEditForm = (library: Library) => {
    setEditingLibrary(library);
    setShowCreateForm(false);
  };

  const cancelForm = () => {
    setShowCreateForm(false);
    setEditingLibrary(null);
  };

  const confirmDelete = (library: Library) => {
    setShowDeleteConfirm(library);
  };

  const handleScanLibraries = async () => {
    if (activeScanOperation) {
      // Cancel the current scan
      const result = await cancelScanOperation(activeScanOperation.id);
      notify({
        title: result.success ? "Scan Cancelled" : "Cancel Failed",
        message: result.message,
        type: result.success ? "info" : "error",
      });
    } else {
      // Start a new background scan
      const result = await startBackgroundScan();
      notify({
        title: result.success ? "Scan Started" : "Scan Failed",
        message: result.message,
        type: result.success ? "success" : "error",
      });
    }
  };

  const formatProgress = (operation: ScanOperationInfo) => {
    if (operation.state === "Running") {
      const percent = Math.round(operation.progress);
      const speed = operation.speedFilesPerSecond
        ? ` (${operation.speedFilesPerSecond.toFixed(1)} files/s)`
        : "";
      const eta = operation.estimatedTimeSeconds
        ? ` - ETA: ${Math.round(operation.estimatedTimeSeconds)}s`
        : "";
      return `${percent}%${speed}${eta}`;
    }
    return operation.state;
  };

  const getScanButtonText = () => {
    if (!activeScanOperation) return "Scan Libraries";

    if (activeScanOperation.state === "Running") {
      return `Cancel Scan (${Math.round(activeScanOperation.progress)}%)`;
    }

    return "Scan Libraries";
  };

  const getScanButtonIcon = () => {
    if (!activeScanOperation) {
      return (
        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (activeScanOperation.state === "Running") {
      return (
        <svg
          className="w-4 h-4 mr-2 animate-spin"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Libraries"
        description="Manage your media libraries and organize your content collections."
        actions={
          <div className="flex gap-3">
            <button
              onClick={openCreateForm}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Create Library
            </button>
            <button
              onClick={handleScanLibraries}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
            >
              {getScanButtonIcon()}
              {getScanButtonText()}
            </button>
          </div>
        }
      />

      {/* Library count */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        {libraries.length} {libraries.length === 1 ? "library" : "libraries"}
      </div>

      {/* Scan Progress Section */}
      {activeScanOperation && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Scan Progress
          </h2>
          <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-900/20 dark:border-blue-800">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 mr-2 text-blue-600 animate-spin dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-base font-medium text-blue-900 dark:text-blue-100">
                  Scanning Libraries
                </span>
              </div>
              <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                {formatProgress(activeScanOperation)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-blue-200 rounded-full h-3 mb-3 dark:bg-blue-800">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300 dark:bg-blue-400"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, activeScanOperation.progress)
                  )}%`,
                }}
              ></div>
            </div>

            {/* Progress Details */}
            <div className="flex justify-between text-sm text-blue-700 dark:text-blue-300 mb-2">
              <span>
                {activeScanOperation.processedFiles} /{" "}
                {activeScanOperation.totalFiles} files processed
              </span>
              <span>
                {activeScanOperation.foundMetadata} metadata entries found
              </span>
            </div>

            {/* Current File */}
            {activeScanOperation.currentFile && (
              <div className="text-sm text-blue-600 dark:text-blue-400 truncate mb-2">
                <span className="font-medium">Processing:</span> {activeScanOperation.currentFile}
              </div>
            )}

            {/* Connection Status */}
            {!isConnected && (
              <div className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Connection lost - progress updates may be delayed
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Form */}
      {showCreateForm && (
        <LibraryForm
          onSubmit={handleCreateLibrary}
          onCancel={cancelForm}
          isLoading={loading}
        />
      )}

      {editingLibrary && (
        <LibraryForm
          library={editingLibrary}
          onSubmit={handleUpdateLibrary}
          onCancel={cancelForm}
          isLoading={loading}
        />
      )}

      {/* Libraries Section */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Your Libraries
        </h2>
        
        {/* Libraries List */}
        <LibraryList
          libraries={libraries}
          onEdit={openEditForm}
          onDelete={confirmDelete}
          loading={loading}
        />
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 dark:bg-gray-800">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3 dark:bg-red-900/20">
                <svg
                  className="w-4 h-4 text-red-600 dark:text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Delete Library
              </h3>
            </div>
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the library "
                {showDeleteConfirm.title}"? This action cannot be undone.
              </p>
              <p className="text-xs text-gray-500 mt-2 dark:text-gray-500">
                Path: {showDeleteConfirm.directoryPath}
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteLibrary(showDeleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
