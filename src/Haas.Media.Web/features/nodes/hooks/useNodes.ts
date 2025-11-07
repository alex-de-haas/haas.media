"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
import type { NodeInfo, ConnectNodeRequest, UpdateNodeRequest, NodeValidationResult, ValidateNodeRequest } from "@/types/node";

export function useNodes() {
  const [nodes, setNodes] = useState<NodeInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJsonWithAuth<NodeInfo[]>(`${downloaderApi}/api/nodes`);
      setNodes(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const validateNode = useCallback(
    async (request: ValidateNodeRequest): Promise<{ success: boolean; message: string; result?: NodeValidationResult }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/nodes/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          const result = await response.json();
          return {
            success: result.isValid,
            message: result.isValid ? "Node is valid" : result.errorMessage || "Validation failed",
            result,
          };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || "Validation failed" };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [],
  );

  const connectNode = useCallback(
    async (request: ConnectNodeRequest): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/nodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          await fetchNodes(); // Refresh the node list
          return { success: true, message: "Node connected successfully" };
        } else {
          const errorText = await response.text();
          let errorMessage = errorText || "Connection failed";
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // Ignore JSON parse errors
          }
          return { success: false, message: errorMessage };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchNodes],
  );

  const updateNode = useCallback(
    async (id: string, request: UpdateNodeRequest): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/nodes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(request),
        });

        if (response.ok) {
          await fetchNodes(); // Refresh the node list
          return { success: true, message: "Node updated successfully" };
        } else {
          const errorText = await response.text();
          let errorMessage = errorText || "Update failed";
          try {
            const errorJson = JSON.parse(errorText);
            if (errorJson.error) {
              errorMessage = errorJson.error;
            }
          } catch {
            // Ignore JSON parse errors
          }
          return { success: false, message: errorMessage };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchNodes],
  );

  const deleteNode = useCallback(
    async (id: string): Promise<{ success: boolean; message: string }> => {
      try {
        const response = await fetchWithAuth(`${downloaderApi}/api/nodes/${id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await fetchNodes(); // Refresh the node list
          return { success: true, message: "Node deleted successfully" };
        } else {
          const errorText = await response.text();
          return { success: false, message: errorText || "Delete failed" };
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Network error occurred";
        return { success: false, message };
      }
    },
    [fetchNodes],
  );

  const fetchNodeMetadata = useCallback(async (nodeId: string): Promise<{ success: boolean; message: string; count?: number }> => {
    try {
      const response = await fetchWithAuth(`${downloaderApi}/api/nodes/${nodeId}/fetch-metadata`, {
        method: "POST",
      });

      if (response.ok) {
        const result = await response.json();
        // Response format: { totalFetched, savedCount, skippedCount, deletedCount }
        const { totalFetched = 0, savedCount = 0, skippedCount = 0, deletedCount = 0 } = result;
        
        let message = `Fetched ${totalFetched} files (${savedCount} saved, ${skippedCount} skipped)`;
        if (deletedCount > 0) {
          message += `, ${deletedCount} deleted`;
        }
        
        return {
          success: true,
          message,
          count: savedCount,
        };
      } else {
        const errorText = await response.text();
        let errorMessage = errorText || "Failed to fetch metadata";
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch {
          // Ignore JSON parse errors
        }
        return { success: false, message: errorMessage };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Network error occurred";
      return { success: false, message };
    }
  }, []);

  useEffect(() => {
    fetchNodes();
  }, [fetchNodes]);

  return {
    nodes,
    loading,
    error,
    fetchNodes,
    validateNode,
    connectNode,
    updateNode,
    deleteNode,
    fetchNodeMetadata,
  };
}
