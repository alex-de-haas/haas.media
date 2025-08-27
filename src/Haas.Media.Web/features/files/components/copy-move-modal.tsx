"use client";

import { useState, useEffect } from "react";
import type { FileItem, CopyFileRequest, MoveFileRequest } from "@/types/file";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import FileList from "./file-list";

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
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Fetch files for the file browser
  const fetchFiles = async (path?: string) => {
    setFilesLoading(true);
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      
      const url = new URL(`${downloaderApi}/api/files`);
      if (path) url.searchParams.set("path", path);
      
      const response = await fetch(url.toString(), { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }
      
      const data = await response.json();
      setFiles(data);
      setCurrentPath(path || "");
    } catch (err) {
      console.error("Failed to fetch files:", err);
    } finally {
      setFilesLoading(false);
    }
  };

  // Load files when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchFiles("");
      setSelectedDestination("");
      setDestinationPath("");
      setShowManualInput(false);
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    fetchFiles(path);
  };

  const handleSelectCurrentDirectory = () => {
    setSelectedDestination(currentPath);
    setDestinationPath(currentPath);
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const basePath = showManualInput ? destinationPath.trim() : selectedDestination;
    if (!basePath) return;

    setLoading(true);

    try {
      // Combine destination path with original filename
      const finalDestinationPath = basePath ? `${basePath}/${item.name}` : item.name;
      
      const data = {
        sourcePath: item.relativePath,
        destinationPath: finalDestinationPath,
      };

      const result = await onConfirm(data);
      if (result?.success) {
        onClose();
        setDestinationPath("");
        setSelectedDestination("");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setDestinationPath("");
    setSelectedDestination("");
    setShowManualInput(false);
  };

  const actionTitle = action === "copy" ? "Copy" : "Move";
  const actionVerb = action === "copy" ? "copying" : "moving";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col dark:bg-gray-800">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {actionTitle} {item.name}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Current location: {item.relativePath}
            </p>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Choose Destination
                </label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowManualInput(!showManualInput)}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {showManualInput ? "Use Browser" : "Manual Input"}
                  </button>
                </div>
              </div>

              {showManualInput ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={destinationPath}
                    onChange={(e) => setDestinationPath(e.target.value)}
                    placeholder={`Enter destination directory path (${item.name} will be added automatically)`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-400"
                    required
                    autoFocus
                  />
                  {destinationPath && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Final destination: <span className="font-medium">{destinationPath ? `${destinationPath}/${item.name}` : item.name}</span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedDestination ? (
                        <>
                          Selected directory: <span className="font-medium">{selectedDestination || "Root directory"}</span>
                          <br />
                          Final destination: <span className="font-medium">{selectedDestination ? `${selectedDestination}/${item.name}` : item.name}</span>
                        </>
                      ) : (
                        "Navigate to select a destination directory"
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={handleSelectCurrentDirectory}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      Select Current Directory
                    </button>
                  </div>
                  <div style={{ height: "300px" }}>
                    <div className="overflow-y-auto h-full">
                      <FileList
                        files={files.filter(f => f.isDirectory)} // Only show directories
                        currentPath={currentPath}
                        onNavigate={handleNavigate}
                        onDelete={() => {}} // Disable actions in destination picker
                        onCopy={() => {}}
                        onMove={() => {}}
                        loading={filesLoading}
                      />
                    </div>
                  </div>
                </div>
              )}

              {action === "move" && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3 dark:bg-yellow-900/20 dark:border-yellow-800">
                  <p className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> Moving will remove the file from its current location.
                  </p>
                </div>
              )}
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
              disabled={loading || (!showManualInput && !selectedDestination) || (showManualInput && !destinationPath.trim())}
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
