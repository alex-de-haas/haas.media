"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
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
      const data = await fetchJsonWithAuth<Library[]>(`${downloaderApi}/api/metadata/libraries`);
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
        const response = await fetchWithAuth(`${downloaderApi}/api/metadata/libraries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        const response = await fetchWithAuth(`${downloaderApi}/api/metadata/libraries/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
        const response = await fetchWithAuth(`${downloaderApi}/api/metadata/libraries/${id}`, {
          method: "DELETE",
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

  const startMetadataSync = useCallback(
    async (options?: {
      libraryIds?: string[];
      refreshMovies?: boolean;
      refreshTvShows?: boolean;
      refreshPeople?: boolean;
    }): Promise<{ success: boolean; message: string; operationId?: string }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/metadata/sync`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            options ?? { libraryIds: null, refreshMovies: true, refreshTvShows: true, refreshPeople: true },
          ),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.message ?? "Metadata sync started successfully",
            operationId: data.operationId,
          };
        }

        const errorText = await response.text();
        return { success: false, message: errorText || "Failed to start metadata sync" };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred while starting metadata sync";
        return { success: false, message };
      }
    },
    [],
  );

  const startLibraryScan = useCallback(
    async (options?: {
      scanForNewFiles?: boolean;
      updateFileMetadata?: boolean;
      updateMovies?: boolean;
      updateTvShows?: boolean;
      updatePeople?: boolean;
    }): Promise<{ success: boolean; message: string; operationId?: string }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/metadata/libraries/scan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(options ?? { scanForNewFiles: true }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            success: true,
            message: data.message ?? "Library scan started successfully",
            operationId: data.operationId,
          };
        }

        const errorText = await response.text();
        return { success: false, message: errorText || "Failed to start library scan" };
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred while starting library scan";
        return { success: false, message };
      }
    },
    [],
  );

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
    startMetadataSync,
    startLibraryScan,
  };
}
