import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiDownloaderUrl } from "@/lib/env";
import type { FileMetadata } from "@/types/metadata";
import { LibraryType } from "@/types/library";

/**
 * Hook to fetch all file metadata with optional filtering
 */
export function useFileMetadata(libraryId?: string, mediaId?: string) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const url = new URL(`${getApiDownloaderUrl()}/api/metadata/files`);
      if (libraryId) {
        url.searchParams.set("libraryId", libraryId);
      }
      if (mediaId) {
        url.searchParams.set("mediaId", mediaId);
      }

      const response = await fetchWithAuth(url.toString());
      const filesData = await response.json();
      setFiles(filesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  }, [libraryId, mediaId]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  return { files, loading, error, refetch: fetchFiles };
}

/**
 * Hook to fetch a single file metadata by ID
 */
export function useFileMetadataById(id: string | null) {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFile = useCallback(async () => {
    if (!id) {
      setFile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/files/${id}`);
      const fileData = await response.json();
      setFile(fileData);
    } catch (err) {
      if (err instanceof Error && err.message.includes("404")) {
        setFile(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load file");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchFile();
  }, [fetchFile]);

  return { file, loading, error, refetch: fetchFile };
}

/**
 * Hook to fetch files associated with a specific media item (movie or TV show)
 */
export function useFilesByMediaId(mediaId: string | number | null, mediaType: LibraryType) {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    if (!mediaId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const endpoint = mediaType === LibraryType.Movies ? "movies" : "tvshows";
      const response = await fetchWithAuth(
        `${getApiDownloaderUrl()}/api/metadata/${endpoint}/${mediaId}/files`
      );
      const filesData = await response.json();
      setFiles(filesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files for media");
    } finally {
      setLoading(false);
    }
  }, [mediaId, mediaType]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  return { files, loading, error, refetch: fetchFiles };
}

/**
 * Hook to manage file metadata operations (add, delete)
 */
export function useFileMetadataOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFile = useCallback(async (fileMetadata: Omit<FileMetadata, "id" | "createdAt" | "updatedAt">) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fileMetadata),
      });

      const createdFile = await response.json();
      return { success: true, file: createdFile as FileMetadata };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add file";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      setLoading(true);
      setError(null);

      await fetchWithAuth(`${getApiDownloaderUrl()}/api/metadata/files/${fileId}`, {
        method: "DELETE",
      });

      return { success: true, message: "File deleted successfully" };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete file";
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  return { addFile, deleteFile, loading, error };
}
