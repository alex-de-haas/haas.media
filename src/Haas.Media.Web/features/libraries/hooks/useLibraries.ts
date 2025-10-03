"use client";

import { useState, useEffect, useCallback } from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { Library, CreateLibraryRequest, UpdateLibraryRequest } from "@/types/library";

export function useLibraries() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLibraries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/metadata/libraries`, {
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch libraries: ${response.statusText}`);
      }

      const data = await response.json();
      setLibraries(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createLibrary = useCallback(
    async (request: CreateLibraryRequest): Promise<{ success: boolean; message: string }> => {
      try {
        const token = await getValidToken();
        const headers = new Headers({
          "Content-Type": "application/json",
        });
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const response = await fetch(`${downloaderApi}/api/metadata/libraries`, {
          method: "POST",
          headers,
          body: JSON.stringify(request),
        });

        if (response.ok) {
          await fetchLibraries(); // Refresh the library list
          return { success: true, message: "Library created successfully" };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || "Create failed" };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchLibraries],
  );

  const updateLibrary = useCallback(
    async (id: string, request: UpdateLibraryRequest): Promise<{ success: boolean; message: string }> => {
      try {
        const token = await getValidToken();
        const headers = new Headers({
          "Content-Type": "application/json",
        });
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const response = await fetch(`${downloaderApi}/api/metadata/libraries/${id}`, {
          method: "PUT",
          headers,
          body: JSON.stringify(request),
        });

        if (response.ok) {
          await fetchLibraries(); // Refresh the library list
          return { success: true, message: "Library updated successfully" };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || "Update failed" };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchLibraries],
  );

  const deleteLibrary = useCallback(
    async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        const token = await getValidToken();
        const headers = new Headers();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const response = await fetch(`${downloaderApi}/api/metadata/libraries/${id}`, {
          method: "DELETE",
          headers,
        });

        if (response.ok) {
          await fetchLibraries(); // Refresh the library list
          return { success: true, message: "Library deleted successfully" };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || "Delete failed" };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchLibraries],
  );

  const startBackgroundScan = useCallback(async (): Promise<{ success: boolean; message: string; operationId?: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/metadata/scan/start`, {
        method: "POST",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Background scan started successfully",
          operationId: data.operationId,
        };
      } else {
        const errorText = await response.text();
        return { success: false, message: errorText || "Failed to start background scan" };
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Network error occurred while starting background scan";
      return { success: false, message };
    }
  }, []);

  const startMetadataRefresh = useCallback(async (): Promise<{ success: boolean; message: string; operationId?: string }> => {
    try {
      const token = await getValidToken();
      const headers = new Headers({
        "Content-Type": "application/json",
      });
      if (token) headers.set("Authorization", `Bearer ${token}`);

      const response = await fetch(`${downloaderApi}/api/metadata/refresh/start`, {
        method: "POST",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: data.message ?? "Metadata refresh started successfully",
          operationId: data.operationId,
        };
      }

      const errorText = await response.text();
      return { success: false, message: errorText || "Failed to start metadata refresh" };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Network error occurred while starting metadata refresh";
      return { success: false, message };
    }
  }, []);

  useEffect(() => {
    fetchLibraries();
  }, [fetchLibraries]);

  return {
    libraries,
    loading,
    error,
    fetchLibraries,
    createLibrary,
    updateLibrary,
    deleteLibrary,
    startBackgroundScan,
    startMetadataRefresh,
  };
}
