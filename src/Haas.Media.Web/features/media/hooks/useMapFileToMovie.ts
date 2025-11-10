import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
import { getApiUrl } from "@/lib/env";
import type { FileMetadata } from "@/types/metadata";
import { LibraryType } from "@/types/library";

export function useMapFileToMovie() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapFilesToMovie = async (movieId: number, fileIds: string[]): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      // For each file, create a new FileMetadata association
      const promises = fileIds.map(async (fileId) => {
        // First, get the existing file metadata to preserve its data
        const response = await fetchWithAuth(`${getApiUrl()}/api/metadata/files/${fileId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch file metadata ${fileId}`);
        }

        const existingFile: FileMetadata = await response.json();

        // Create new file metadata entry for the movie
        const newFileMetadata = {
          libraryId: existingFile.libraryId,
          nodeId: existingFile.nodeId,
          mediaId: movieId.toString(),
          mediaType: LibraryType.Movies,
          filePath: existingFile.filePath,
          md5Hash: existingFile.md5Hash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const createResponse = await fetchWithAuth(`${getApiUrl()}/api/metadata/files`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newFileMetadata),
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create file metadata for ${fileId}`);
        }

        return createResponse.json();
      });

      await Promise.all(promises);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to map files to movie");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { mapFilesToMovie, loading, error };
}
