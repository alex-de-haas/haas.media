"use client";

import { useEffect, useState, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { BackgroundTaskInfo } from "@/types";

export interface ScanOperationInfo {
  id: string;
  libraryPath: string;
  libraryTitle: string;
  totalFiles: number;
  processedFiles: number;
  foundMetadata: number;
  startTime: string;
  currentFile?: string;
  speedFilesPerSecond?: number;
  estimatedTimeSeconds?: number;
}

export function useMetadataSignalR() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [scanOperations, setScanOperations] = useState<ScanOperationInfo[]>([]);

  const mapTaskToScanOperation = useCallback((task: BackgroundTaskInfo): ScanOperationInfo | null => {
    if (task.type !== "MetadataScanTask" || !task.payload || typeof task.payload !== "object") {
      return null;
    }

    const raw = task.payload as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : task.id;
    const libraryPath = typeof raw.libraryPath === "string" ? raw.libraryPath : "All Libraries";
    const libraryTitle = typeof raw.libraryTitle === "string" ? raw.libraryTitle : "Scanning libraries";

    const toNumber = (value: unknown): number => (typeof value === "number" ? value : Number(value ?? 0));

    const startTimeRaw = typeof raw.startTime === "string" ? raw.startTime : null;
    const startTime = startTimeRaw ?? task.startedAt ?? task.createdAt;

    return {
      id,
      libraryPath,
      libraryTitle,
      totalFiles: toNumber(raw.totalFiles),
      processedFiles: toNumber(raw.processedFiles),
      foundMetadata: toNumber(raw.foundMetadata),
      startTime,
      currentFile: typeof raw.currentFile === "string" ? raw.currentFile : undefined,
      speedFilesPerSecond:
        typeof raw.speedFilesPerSecond === "number" ? raw.speedFilesPerSecond : undefined,
      estimatedTimeSeconds:
        typeof raw.estimatedTimeSeconds === "number" ? raw.estimatedTimeSeconds : undefined,
    };
  }, []);

  const upsertScanOperation = useCallback((operation: ScanOperationInfo) => {
    setScanOperations(prev => {
      const lookup = new Map(prev.map(existing => [existing.id, existing]));
      lookup.set(operation.id, operation);
      return Array.from(lookup.values()).sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    });
  }, []);

  const removeScanOperation = useCallback((operationId: string) => {
    setScanOperations(prev => prev.filter(operation => operation.id !== operationId));
  }, []);

  const fetchOperations = useCallback(async () => {
    try {
      const token = await getValidToken();
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(
        `${downloaderApi}/api/background-tasks/MetadataScanTask`,
        { headers }
      );

      if (!response.ok) {
        console.error("Failed to fetch metadata background tasks:", response.statusText);
        return;
      }

      const payload = (await response.json()) as BackgroundTaskInfo[];
      const operations = payload
        .map(mapTaskToScanOperation)
        .filter((operation): operation is ScanOperationInfo => Boolean(operation));

      setScanOperations(
        operations.sort(
          (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        )
      );
    } catch (error) {
      console.error("Failed to fetch metadata background tasks:", error);
    }
  }, [mapTaskToScanOperation]);

  const connectToHub = useCallback(async () => {
    try {
      const token = await getValidToken();
      
      if (!token || !downloaderApi) {
        console.log("No token or downloader API available for SignalR connection");
        setScanOperations([]);
        return;
      }

      await fetchOperations();

      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${downloaderApi}/hub/background-tasks?type=MetadataScanTask`, {
          accessTokenFactory: () => token,
          withCredentials: true,
        })
        .withAutomaticReconnect()
        .build();

      newConnection.on("TaskUpdated", (task: BackgroundTaskInfo) => {
        if (task.type !== "MetadataScanTask") {
          return;
        }

        const operation = mapTaskToScanOperation(task);
        if (operation) {
          upsertScanOperation(operation);
        } else if (!task.payload) {
          removeScanOperation(task.id);
        }
      });

      await newConnection.start();
      setConnection(newConnection);
    } catch (error) {
      console.error("Error connecting to metadata SignalR hub:", error);
    }
  }, [fetchOperations, mapTaskToScanOperation, removeScanOperation, upsertScanOperation]);

  const disconnect = useCallback(async () => {
    if (connection) {
      try {
        await connection.stop();
        setConnection(null);
        setScanOperations([]);
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
