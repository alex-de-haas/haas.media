"use client";

import { useState, useEffect, useRef } from "react";
import * as signalR from "@microsoft/signalr";
import type { FileItem, CopyRequest, MoveRequest, CreateDirectoryRequest, RenameRequest, CopyOperationInfo } from "@/types/file";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";

export function useFiles(initialPath?: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [copyOperations, setCopyOperations] = useState<CopyOperationInfo[]>([]);
  const [currentPath, setCurrentPath] = useState<string>(initialPath || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Initialize SignalR connection
  useEffect(() => {
    const initializeConnection = async () => {
      try {
        const token = await getValidToken();
        
        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${downloaderApi}/hub/files`, {
            accessTokenFactory: () => token || "",
          })
          .withAutomaticReconnect()
          .build();

        connection.on("CopyOperationUpdated", (operation: CopyOperationInfo) => {
          setCopyOperations(prev => {
            const existingIndex = prev.findIndex(op => op.id === operation.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = operation;
              return updated;
            } else {
              return [...prev, operation];
            }
          });
        });

        connection.on("CopyOperationDeleted", (operationId: string) => {
          setCopyOperations(prev => prev.filter(op => op.id !== operationId));
        });

        await connection.start();
        connectionRef.current = connection;
        
        // Fetch initial copy operations
        await fetchCopyOperations();
      } catch (err) {
        console.error("SignalR connection failed:", err);
      }
    };

    initializeConnection();

    return () => {
      connectionRef.current?.stop();
    };
  }, []);

  const fetchFiles = async (path?: string) => {
    setLoading(true);
    setError(null);
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
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  const upload = async (
    filesToUpload: File[],
    options?: { overwriteExisting?: boolean; targetPath?: string }
  ): Promise<{
    success: boolean;
    message: string;
    uploaded: number;
    skipped: number;
    errors: string[];
  }> => {
    if (!filesToUpload.length) {
      return {
        success: false,
        message: "No files selected.",
        uploaded: 0,
        skipped: 0,
        errors: [],
      };
    }

    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("files", file);
      });

      if (options?.overwriteExisting) {
        formData.append("overwrite", "true");
      }

      const url = new URL(`${downloaderApi}/api/files/upload`);
      const target = options?.targetPath ?? currentPath;
      if (target) {
        url.searchParams.set("path", target);
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers,
        body: formData,
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : Array.isArray(payload?.errors) && payload.errors.length > 0
              ? payload.errors.join("; ")
              : "Upload failed.";
        return {
          success: false,
          message,
          uploaded: Number(payload?.uploaded) || 0,
          skipped: Number(payload?.skipped) || 0,
          errors: Array.isArray(payload?.errors) ? payload.errors : [],
        };
      }

      await fetchFiles(currentPath); // Refresh listing after upload

      const uploaded = Number(payload?.uploaded) || filesToUpload.length;
      const skipped = Number(payload?.skipped) || 0;
      const errors = Array.isArray(payload?.errors) ? payload.errors : [];

      let message = `Uploaded ${uploaded} file${uploaded === 1 ? "" : "s"}.`;
      if (skipped > 0) {
        message += ` Skipped ${skipped}.`;
      }
      if (errors.length > 0) {
        message += ` Errors: ${errors.join("; ")}`;
      }

      return {
        success: errors.length === 0,
        message,
        uploaded,
        skipped,
        errors,
      };
    } catch (error) {
      return {
        success: false,
        message: "Network error occurred.",
        uploaded: 0,
        skipped: 0,
        errors: [],
      };
    }
  };

  const downloadTorrentFromFile = async (
    path: string
  ): Promise<{ success: boolean; message: string; hash?: string }> => {
    if (!path) {
      return { success: false, message: "Path is required." };
    }

    try {
      const token = await getValidToken();
      const headers = new Headers({ "Content-Type": "application/json" });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/torrents/from-file`, {
        method: "POST",
        headers,
        body: JSON.stringify({ path }),
      });

      let payload: any = null;
      try {
        payload = await response.json();
      } catch (error) {
        payload = null;
      }

      if (!response.ok) {
        const message =
          typeof payload?.message === "string"
            ? payload.message
            : "Failed to start torrent download.";
        return { success: false, message };
      }

      const hash = typeof payload?.hash === "string" ? payload.hash : undefined;
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : "Torrent download started.";

      return {
        success: true,
        message: hash ? `${message} (hash ${hash})` : message,
        hash,
      };
    } catch (error) {
      return { success: false, message: "Network error occurred." };
    }
  };

  const fetchCopyOperations = async () => {
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      
      const response = await fetch(`${downloaderApi}/api/files/copy-operations`, { headers });
      if (response.ok) {
        const operations = await response.json();
        setCopyOperations(operations);
      }
    } catch (err) {
      console.error("Failed to fetch copy operations:", err);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const copy = async (request: CopyRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/files/copy`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, message: `Copy operation started with ID: ${result.operationId}` };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Copy failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const cancelCopyOperation = async (operationId: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/files/copy-operations/${operationId}`, {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        return { success: true, message: "Copy operation cancelled" };
      } else {
        return { success: false, message: "Failed to cancel operation" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const move = async (request: MoveRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/files/move`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (response.ok) {
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "File moved successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Move failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const deleteItem = async (path: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const url = new URL(`${downloaderApi}/api/files`);
      url.searchParams.set("path", path);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "Item deleted successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Delete failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const createDirectory = async (request: CreateDirectoryRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/files/directory`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });

      if (response.ok) {
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "Directory created successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Create failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const rename = async (request: RenameRequest): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/files/rename`, {
        method: "PUT",
        headers,
        body: JSON.stringify(request),
      });

      if (response.ok) {
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "Item renamed successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Rename failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  return {
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
    upload,
    downloadTorrentFromFile,
    refresh: () => fetchFiles(currentPath),
    // Legacy aliases for backward compatibility
    copyFile: copy,
    moveFile: move,
    deleteFile: deleteItem,
    deleteDirectory: deleteItem,
  };
}
