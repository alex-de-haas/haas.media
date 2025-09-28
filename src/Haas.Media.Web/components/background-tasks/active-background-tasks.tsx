"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  BackgroundTaskState,
  backgroundTaskStateLabel,
} from "@/types";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";

interface ActiveBackgroundTasksProps {
  enabled: boolean;
  maxVisible?: number;
}

export default function ActiveBackgroundTasks({
  enabled,
  maxVisible = 3,
}: ActiveBackgroundTasksProps) {
  const { activeTasks, isLoading, error, cancelTask } = useBackgroundTasks({ enabled });
  const [cancellingIds, setCancellingIds] = useState<Set<string>>(new Set());

  const tasksToRender = activeTasks.slice(0, maxVisible);
  const remainingCount = Math.max(activeTasks.length - tasksToRender.length, 0);
  const showContainer = enabled && (isLoading || tasksToRender.length > 0 || Boolean(error));

  if (!showContainer) {
    return null;
  }

  const addCancellingId = (taskId: string) => {
    setCancellingIds(prev => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  };

  const removeCancellingId = (taskId: string) => {
    setCancellingIds(prev => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  };

  const handleCancel = async (taskId: string) => {
    if (cancellingIds.has(taskId)) {
      return;
    }

    addCancellingId(taskId);
    try {
      const result = await cancelTask(taskId);
      if (!result.success && result.message) {
        console.warn(result.message);
      }
    } finally {
      removeCancellingId(taskId);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 text-xs shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
          Active Tasks
        </span>
        {activeTasks.length > 0 && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
            {activeTasks.length}
          </span>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {isLoading && tasksToRender.length === 0 ? (
          <div className="space-y-2">
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-2 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-2 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : (
          tasksToRender.map(task => {
            const progress = Math.round(task.progress);
            const canCancel =
              task.state === BackgroundTaskState.Pending ||
              task.state === BackgroundTaskState.Running;
            const isCancelling = cancellingIds.has(task.id);
            const statusText = task.statusMessage ?? backgroundTaskStateLabel(task.state);

            return (
              <div
                key={task.id}
                className="rounded-md border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-800/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-700 dark:text-gray-100">
                      {task.name}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500 dark:text-gray-400">
                      {statusText}
                    </p>
                  </div>
                  {canCancel && (
                    <button
                      type="button"
                      onClick={() => handleCancel(task.id)}
                      disabled={isCancelling}
                      className={clsx(
                        "flex-shrink-0 rounded border px-2 py-1 text-[11px] font-medium transition-colors",
                        isCancelling
                          ? "cursor-not-allowed border-gray-300 text-gray-400 dark:border-gray-600 dark:text-gray-500"
                          : "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-700/60 dark:text-red-300 dark:hover:bg-red-900/30"
                      )}
                    >
                      {isCancelling ? "Cancelling" : "Cancel"}
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{progress}%</span>
                    <span>{backgroundTaskStateLabel(task.state)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-1.5 rounded-full bg-blue-500 transition-all dark:bg-blue-400"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {remainingCount > 0 && (
        <p className="mt-3 text-[11px] text-gray-500 dark:text-gray-400">
          +{remainingCount} more task{remainingCount === 1 ? "" : "s"} in progress
        </p>
      )}

      {error && (
        <p className="mt-3 text-[11px] text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
