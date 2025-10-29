"use client";

import { useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";

export interface DownloadFileFromNodeRequest {
  nodeId: string;
  remoteFilePath: string;
  destinationDirectory: string;
  customFileName?: string;
}

export function useNodeFileDownload() {
  const [downloading, setDownloading] = useState(false);

  const downloadFile = useCallback(
    async (request: DownloadFileFromNodeRequest): Promise<{ success: boolean; message: string; taskId?: string }> => {
      setDownloading(true);
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/nodes/${request.nodeId}/download-file`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            remoteFilePath: request.remoteFilePath,
            libraryId: request.destinationDirectory,
            customFileName: request.customFileName,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: true,
            message: "Download started successfully",
            taskId: result.taskId,
          };
        } else {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || "Download failed";
          return { success: false, message: errorMessage };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      } finally {
        setDownloading(false);
      }
    },
    [],
  );

  return {
    downloadFile,
    downloading,
  };
}
