"use client";

import { useState } from "react";
import { useFiles } from "@/features/files";
import FileList from "@/features/files/components/file-list";
import FileActionsModal from "@/features/files/components/file-actions-modal";
import type { FileItem } from "@/types/file";
import { PageHeader } from "@/components/layout";

export default function FilesPage() {
  const {
    files,
    currentPath,
    loading,
    error,
    navigateToPath,
    copyFile,
    moveFile,
    deleteFile,
    deleteDirectory,
    createDirectory,
  } = useFiles();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: "copy" | "move" | "delete" | "create-directory" | null;
    item?: FileItem;
  }>({
    isOpen: false,
    action: null,
  });

  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const openModal = (
    action: "copy" | "move" | "delete" | "create-directory",
    item?: FileItem
  ) => {
    setModalState({ isOpen: true, action, ...(item && { item }) });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, action: null });
  };

  const handleModalConfirm = async (data: any) => {
    const { action, item } = modalState;
    let result;

    switch (action) {
      case "copy":
        result = await copyFile(data);
        break;
      case "move":
        result = await moveFile(data);
        break;
      case "delete":
        if (item?.isDirectory) {
          result = await deleteDirectory(data);
        } else {
          result = await deleteFile(data);
        }
        break;
      case "create-directory":
        result = await createDirectory(data);
        break;
      default:
        result = { success: false, message: "Unknown action" };
    }

    showNotification(result.message, result.success ? "success" : "error");
    return result;
  };

  return (
    <main className="mx-auto space-y-10">
      <PageHeader
        title="Files"
        description="Manage your files and folders."
        actions={
          <button
            onClick={() => openModal("create-directory")}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Create Directory
          </button>
        }
      />

      {/* Notification */}
      {notification && (
        <div
          className={`mb-6 p-4 rounded-md ${
            notification.type === "success"
              ? "bg-green-50 border border-green-200 text-green-800"
              : "bg-red-50 border border-red-200 text-red-800"
          }`}
        >
          <div className="flex">
            <div className="flex-shrink-0">
              {notification.type === "success" ? (
                <svg
                  className="w-5 h-5 text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setNotification(null)}
                className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                <span className="sr-only">Close</span>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading files
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File list */}
      <FileList
        files={files}
        currentPath={currentPath}
        onNavigate={navigateToPath}
        onDelete={(item) => openModal("delete", item)}
        onCopy={(item) => openModal("copy", item)}
        onMove={(item) => openModal("move", item)}
        loading={loading}
      />

      {/* Action modal */}
      <FileActionsModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        action={modalState.action}
        {...(modalState.item && { item: modalState.item })}
        currentPath={currentPath}
        onConfirm={handleModalConfirm}
      />
    </main>
  );
}
