"use client";

import { useState } from "react";
import { useLibraries, LibraryList, LibraryForm } from "@/features/libraries";
import { useNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/layout";
import type { Library } from "@/types/library";

export default function LibrariesClient() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<Library | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Library | null>(null);
  
  const {
    libraries,
    loading,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    scanLibraries,
  } = useLibraries();
  
  const { notify } = useNotifications();

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
    const result = await scanLibraries();
    notify({
      title: result.success ? "Scan Completed" : "Scan Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
  };

  return (
    <div className="mx-auto space-y-6">
      <PageHeader
        title="Libraries"
        description="Manage your media libraries and organize your content collections."
      />

      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {libraries.length} {libraries.length === 1 ? "library" : "libraries"}
        </div>
        <div className="flex gap-3">
          <button
            onClick={openCreateForm}
            className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Library
          </button>
          <button
            onClick={handleScanLibraries}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500 dark:hover:bg-gray-500"
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                  clipRule="evenodd"
                />
              </svg>
              Scan Libraries
            </div>
          </button>
        </div>
      </div>

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

      {/* Libraries List */}
      <LibraryList
        libraries={libraries}
        onEdit={openEditForm}
        onDelete={confirmDelete}
        loading={loading}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 dark:bg-gray-800">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center mr-3 dark:bg-red-900/20">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
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
                Are you sure you want to delete the library "{showDeleteConfirm.title}"? This action cannot be undone.
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
