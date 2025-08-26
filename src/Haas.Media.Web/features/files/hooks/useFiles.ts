"use client";

import { useState, useEffect } from "react";
import type { FileItem, CopyFileRequest, MoveFileRequest, CreateDirectoryRequest } from "@/types/file";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";

export function useFiles(initialPath?: string) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState<string>(initialPath || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const navigateToPath = (path: string) => {
    setCurrentPath(path);
  };

  const copyFile = async (request: CopyFileRequest): Promise<{ success: boolean; message: string }> => {
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
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "File copied successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Copy failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const moveFile = async (request: MoveFileRequest): Promise<{ success: boolean; message: string }> => {
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

  const deleteFile = async (path: string): Promise<{ success: boolean; message: string }> => {
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
        return { success: true, message: "File deleted successfully" };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Delete failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const deleteDirectory = async (path: string): Promise<{ success: boolean; message: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const url = new URL(`${downloaderApi}/api/files/directory`);
      url.searchParams.set("path", path);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers,
      });

      if (response.ok) {
        await fetchFiles(currentPath); // Refresh the file list
        return { success: true, message: "Directory deleted successfully" };
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

  return {
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
    refresh: () => fetchFiles(currentPath),
  };
}
