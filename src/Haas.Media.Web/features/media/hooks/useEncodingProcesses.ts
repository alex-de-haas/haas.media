"use client";

import { useMemo } from "react";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { isActiveBackgroundTask } from "@/types";
import { isEncodingInfo } from "@/types/encoding";
import type { EncodingProcessInfo } from "@/types/encoding";

interface UseEncodingProcessesOptions {
  enabled?: boolean;
}

export function useEncodingProcesses(options?: UseEncodingProcessesOptions) {
  const { tasks, isLoading, error, refetch } = useBackgroundTasks(options);

  const activeEncodings = useMemo(() => {
    const lookup = new Map<string, EncodingProcessInfo>();

    for (const task of tasks) {
      if (task.type !== "EncodingTask" || !isActiveBackgroundTask(task) || !isEncodingInfo(task.payload)) {
        continue;
      }

      const info = task.payload as EncodingProcessInfo;
      const key = `${info.id}:${info.outputPath}`;
      lookup.set(key, info);
    }

    return Array.from(lookup.values()).sort((a, b) => b.progress - a.progress);
  }, [tasks]);

  const encodings: EncodingProcessInfo[] | null = isLoading && tasks.length === 0 ? null : activeEncodings;

  return {
    encodings,
    loading: isLoading,
    error,
    refresh: refetch,
  };
}
