"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { downloaderApi } from "@/lib/api";
import { getValidToken } from "@/lib/auth/token";
import {
  BackgroundTaskInfo,
  isActiveBackgroundTask,
} from "@/types";

interface UseBackgroundTasksOptions {
  enabled?: boolean;
}

const clampProgress = (progress: number): number =>
  Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;

const normalizeTask = (task: BackgroundTaskInfo): BackgroundTaskInfo => ({
  ...task,
  progress: clampProgress(Number(task.progress ?? 0)),
  statusMessage: task.statusMessage ?? null,
});

const sortByCreatedAtDesc = (tasks: BackgroundTaskInfo[]): BackgroundTaskInfo[] =>
  [...tasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

export function useBackgroundTasks(
  { enabled = true }: UseBackgroundTasksOptions = {}
) {
  const [tasks, setTasks] = useState<BackgroundTaskInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const upsertTask = useCallback((task: BackgroundTaskInfo) => {
    setTasks(prev => {
      const lookup = new Map(prev.map(existing => [existing.id, existing]));
      lookup.set(task.id, normalizeTask(task));
      return sortByCreatedAtDesc(Array.from(lookup.values()));
    });
  }, []);

  const fetchTasks = useCallback(async () => {
    if (!enabled) {
      return;
    }

    try {
      setError(null);
      setIsLoading(true);

      const token = await getValidToken();
      const headers = new Headers();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      const response = await fetch(`${downloaderApi}/api/background-tasks`, { headers });
      if (!response.ok) {
        throw new Error(`Failed to fetch background tasks: ${response.statusText}`);
      }

      const payload = (await response.json()) as BackgroundTaskInfo[];
      const normalized = payload.map(normalizeTask);
      setTasks(sortByCreatedAtDesc(normalized));
    } catch (err: any) {
      console.error("Failed to load background tasks", err);
      setError(err?.message ?? "Failed to load background tasks");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setTasks([]);
      setIsLoading(false);
      setError(null);
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => undefined);
        connectionRef.current = null;
      }
      return;
    }

    let disposed = false;

    const startConnection = async () => {
      try {
        const token = await getValidToken();
        if (disposed) {
          return;
        }

        const connection = new signalR.HubConnectionBuilder()
          .withUrl(`${downloaderApi}/hub/background-tasks`, {
            accessTokenFactory: () => token ?? "",
          })
          .withAutomaticReconnect()
          .build();

        connection.on("TaskUpdated", (task: BackgroundTaskInfo) => {
          upsertTask(task);
        });

        connection.onclose(() => {
          if (connectionRef.current === connection) {
            connectionRef.current = null;
          }
        });

        await connection.start();

        if (disposed) {
          await connection.stop();
          return;
        }

        connectionRef.current = connection;
      } catch (err) {
        if (!disposed) {
          console.error(
            "Failed to establish SignalR background task connection",
            err
          );
          setError("Unable to connect to background task updates");
        }
      }
    };

    startConnection();
    fetchTasks();

    return () => {
      disposed = true;
      if (connectionRef.current) {
        connectionRef.current.stop().catch(() => undefined);
        connectionRef.current = null;
      }
    };
  }, [enabled, fetchTasks, upsertTask]);

  const cancelTask = useCallback(
    async (taskId: string): Promise<{ success: boolean; message?: string }> => {
      if (!enabled) {
        return { success: false, message: "Not authenticated" };
      }

      try {
        const token = await getValidToken();
        const headers = new Headers();
        if (token) {
          headers.set("Authorization", `Bearer ${token}`);
        }

        const response = await fetch(`${downloaderApi}/api/background-tasks/${taskId}`, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          const message = `Failed to cancel task (${response.status})`;
          return { success: false, message };
        }

        return { success: true, message: "Cancellation requested" };
      } catch (err: any) {
        console.error("Failed to cancel background task", err);
        return { success: false, message: err?.message ?? "Network error" };
      }
    },
    [enabled]
  );

  const activeTasks = useMemo(
    () => tasks.filter(isActiveBackgroundTask),
    [tasks]
  );

  return {
    tasks,
    activeTasks,
    isLoading,
    error,
    cancelTask,
    refetch: fetchTasks,
  };
}
