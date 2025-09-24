"use client";

import { useFileUpload } from "../hooks/useFileUpload";
import { useNotifications } from "../../../lib/notifications";

interface TorrentUploadProps {
  onUpload: (files: File[]) => Promise<{ success: boolean; message: string }>;
  isUploading?: boolean;
}

export default function TorrentUpload({
  onUpload,
  isUploading = false,
}: TorrentUploadProps) {
  const { notify } = useNotifications();
  const {
    files,
    dragActive,
    handleFileChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    clearFiles,
    removeFile,
  } = useFileUpload([".torrent"]);

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    }
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleUpload = async () => {
    if (!files.length) return;

    const result = await onUpload(files);

    notify({
      title: result.success ? "Upload Success" : "Upload Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });
    if (result.success) clearFiles();
  };

  const handleInvalidFile = (message: string) => {
    notify({ title: "Invalid File", message, type: "warning" });
  };

  const totalSize = files.reduce((acc, file) => acc + file.size, 0);

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
          <div className="flex flex-col items-center justify-center pt-5 pb-6 gap-4 w-full px-4">
            {files.length ? (
              <>
                <svg
                  className="w-8 h-8 text-green-500 dark:text-green-400"
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
                <div className="w-full space-y-2">
                  <div className="max-h-40 overflow-y-auto rounded border border-dashed border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70">
                    <ul className="divide-y divide-gray-200 dark:divide-gray-600 text-left">
                      {files.map((file, index) => (
                        <li
                          key={`${file.name}-${file.lastModified}-${index}`}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <div className="max-w-[70%]">
                            <p className="font-medium text-gray-900 dark:text-white truncate" title={file.name}>
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatSize(file.size)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeFile(index);
                            }}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 focus:outline-none disabled:opacity-50"
                            disabled={isUploading}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selected {files.length} file{files.length > 1 ? "s" : ""} • {formatSize(totalSize)} total
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? "Uploading..." : "Upload All"}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearFiles();
                    }}
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
                  className="w-8 h-8 text-gray-500 dark:text-gray-400"
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
                <div className="text-center">
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    .torrent files only
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            id="dropzone-file"
            type="file"
            className="hidden"
            accept=".torrent"
            multiple
            onChange={(e) => handleFileChange(e, handleInvalidFile)}
          />
        </label>
      </div>
    </div>
  );
}
