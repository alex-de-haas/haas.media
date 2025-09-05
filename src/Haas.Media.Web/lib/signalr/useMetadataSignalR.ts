"use client";

import { useEffect, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { getValidToken } from "@/lib/auth/token";

export interface ScanOperationInfo {
  id: string;
  libraryPath: string;
  libraryTitle: string;
  totalFiles: number;
  processedFiles: number;
  foundMetadata: number;
  progress: number;
  state: "Running" | "Completed" | "Failed" | "Cancelled";
  startTime: string;
  completedTime?: string;
  errorMessage?: string;
  currentFile?: string;
  speedFilesPerSecond?: number;
  estimatedTimeSeconds?: number;
}

export function useMetadataSignalR() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [scanOperations, setScanOperations] = useState<ScanOperationInfo[]>([]);

  const connectToHub = useCallback(async () => {
    try {
      const token = await getValidToken();
      const downloaderApi = process.env.NEXT_PUBLIC_DOWNLOADER_API;
      
      if (!token || !downloaderApi) {
        console.log("No token or downloader API available for SignalR connection");
        return;
      }

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${downloaderApi}/hub/metadata`, {
          accessTokenFactory: () => token,
          withCredentials: true,
        })
        .withAutomaticReconnect()
        .build();

      // Set up event handlers
      newConnection.on("ScanOperationUpdated", (operation: ScanOperationInfo) => {
        console.log("Received ScanOperationUpdated:", operation);
        setScanOperations(prev => {
          const index = prev.findIndex(op => op.id === operation.id);
          if (index >= 0) {
            const updated = [...prev];
            updated[index] = operation;
            return updated;
          } else {
            return [...prev, operation];
          }
        });
      });

      newConnection.on("ScanOperationDeleted", (operationId: string) => {
        console.log("Received ScanOperationDeleted:", operationId);
        setScanOperations(prev => prev.filter(op => op.id !== operationId));
      });

      await newConnection.start();
      setConnection(newConnection);
      console.log("Metadata SignalR connection established");
    } catch (error) {
      console.error("Error connecting to metadata SignalR hub:", error);
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (connection) {
      try {
        await connection.stop();
        setConnection(null);
        setScanOperations([]);
        console.log("Metadata SignalR connection closed");
      } catch (error) {
        console.error("Error disconnecting from metadata SignalR hub:", error);
      }
    }
  }, [connection]);

  useEffect(() => {
    connectToHub();

    return () => {
      disconnect();
    };
  }, [connectToHub, disconnect]);

  return {
    connection,
    scanOperations,
    isConnected: connection?.state === signalR.HubConnectionState.Connected,
  };
}
