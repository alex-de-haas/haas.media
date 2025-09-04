"use client";

import { useState, ReactNode } from "react";
import { useFiles } from "@/features/files";
import { useNotifications } from "@/lib/notifications";
import FileList from "@/features/files/components/file-list";
import FileActionsModal from "@/features/files/components/file-actions-modal";
import CopyOperationsList from "@/features/files/components/copy-operations-list";
import type { FileItem } from "@/types/file";
import { FileItemType } from "@/types/file";
import { PageHeader } from "@/components/layout";
import Link from "next/link";

interface FileActionsProps {
  item: FileItem;
  onDelete: () => void;
  onCopy: () => void;
  onMove: () => void;
  onRename: () => void;
}

function FileActions({
  item,
  onDelete,
  onCopy,
  onMove,
  onRename,
}: FileActionsProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowActions(!showActions)}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded dark:text-gray-400 dark:hover:text-gray-300"
        aria-label="File actions"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {showActions && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 dark:bg-gray-800 dark:border-gray-700">
          <div className="py-1">
            {(item.type === FileItemType.Media || item.type === FileItemType.Directory) && (
              <Link
                prefetch={false}
                href={`/media-info/${encodeURIComponent(item.relativePath)}`}
                onClick={() => setShowActions(false)}
                className="flex items-center w-full px-4 py-2 text-sm text-left text-blue-600 hover:bg-gray-100 dark:text-blue-400 dark:hover:bg-gray-700"
                aria-label="Media info"
              >
                <svg
                  className="w-4 h-4 mr-3"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="10" x2="12" y2="16" />
                  <circle cx="12" cy="8" r="1" fill="currentColor" stroke="none" />
                </svg>
                Media Info
              </Link>
            )}
            <button
              onClick={() => {
                onCopy();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy
            </button>
            <button
              onClick={() => {
                onMove();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Move
            </button>
            <button
              onClick={() => {
                onRename();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
              </svg>
              Rename
            </button>
            <button
              onClick={() => {
                onDelete();
                setShowActions(false);
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <svg
                className="w-4 h-4 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FilesPage() {
  const {
    files,
    copyOperations,
    currentPath,
    loading,
    error,
    navigateToPath,
    copy,
    cancelCopyOperation,
    move,
    deleteItem,
    createDirectory,
    rename,
  } = useFiles();

  const { notify } = useNotifications();

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    action: "copy" | "move" | "delete" | "create-directory" | "rename" | null;
    item?: FileItem;
  }>({
    isOpen: false,
    action: null,
  });

  const openModal = (
    action: "copy" | "move" | "delete" | "create-directory" | "rename",
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
        result = await copy(data);
        break;
      case "move":
        result = await move(data);
        break;
      case "delete":
        result = await deleteItem(data);
        break;
      case "create-directory":
        result = await createDirectory(data);
        break;
      case "rename":
        result = await rename(data);
        break;
      default:
        result = { success: false, message: "Unknown action" };
    }

    notify({
      message: result.message,
      type: result.success ? "success" : "error",
    });
    return result;
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <PageHeader
        title="Files"
        description="Manage your files and folders."
        actions={
          <button
            onClick={() => openModal("create-directory")}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-offset-gray-950"
          >
            Create Directory
          </button>
        }
      />

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
        loading={loading}
        renderActions={(item: FileItem) => (
          <FileActions
            item={item}
            onDelete={() => openModal("delete", item)}
            onCopy={() => openModal("copy", item)}
            onMove={() => openModal("move", item)}
            onRename={() => openModal("rename", item)}
          />
        )}
      />

      {/* Copy operations list */}
      <CopyOperationsList
        operations={copyOperations}
        onCancel={async (operationId) => {
          const result = await cancelCopyOperation(operationId);
          notify({
            message: result.message,
            type: result.success ? "success" : "error",
          });
          return result;
        }}
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
