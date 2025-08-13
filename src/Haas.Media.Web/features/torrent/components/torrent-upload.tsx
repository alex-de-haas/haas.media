"use client";

import { useFileUpload } from "../hooks/useFileUpload";
import { useNotifications } from "../../../lib/notifications";

interface TorrentUploadProps {
  onUpload: (file: File) => Promise<{ success: boolean; message: string }>;
  isUploading?: boolean;
}

export default function TorrentUpload({
  onUpload,
  isUploading = false,
}: TorrentUploadProps) {
  const { notify } = useNotifications();
  const {
    file,
    dragActive,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearFile,
  } = useFileUpload([".torrent"]);

  const handleUpload = async () => {
    if (!file) return;

    const result = await onUpload(file);

    notify({
      title: result.success ? "Upload Success" : "Upload Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
    if (result.success) clearFile();
  };

  const handleInvalidFile = (message: string) => {
    notify({ title: "Invalid File", message, type: "warning" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center w-full">
        <label
          htmlFor="dropzone-file"
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed cursor-pointer transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50 dark:bg-gray-700"
              : "border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-100 dark:hover:border-gray-500 dark:hover:bg-gray-600"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, handleInvalidFile)}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {file ? (
              <>
                <svg
                  className="w-8 h-8 mb-4 text-green-500 dark:text-green-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                  <button
                    type="button"
                    onClick={clearFile}
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </>
            ) : (
              <>
                <svg
                  className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 16"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                  />
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag
                  and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  .torrent files only
                </p>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".torrent"
            onChange={handleFileChange}
          />
        </label>
      </div>
    </div>
  );
}
