"use client";

import { useMemo } from "react";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { cn, formatDuration, formatRate, formatSize } from "@/lib/utils";
import type { CopyOperationInfo } from "@/types/file";
import {
  BackgroundTaskStatus,
  backgroundTaskStatusLabel,
  isActiveBackgroundTask,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CopyOperationsListProps {
  operations: CopyOperationInfo[];
  onCancel: (operationId: string) => Promise<{ success: boolean; message: string }>;
}

const statusBadgeClass: Record<BackgroundTaskStatus, string> = {
  [BackgroundTaskStatus.Pending]:
    "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:text-amber-300",
  [BackgroundTaskStatus.Running]:
    "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:text-blue-300",
  [BackgroundTaskStatus.Completed]:
    "border-green-200 bg-green-500/10 text-green-600 dark:border-green-400/20 dark:text-green-300",
  [BackgroundTaskStatus.Failed]:
    "border-red-200 bg-red-500/10 text-red-600 dark:border-red-400/20 dark:text-red-300",
  [BackgroundTaskStatus.Cancelled]: "border-muted bg-muted text-muted-foreground",
};

const clampProgress = (value: number): number =>
  Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;

export default function CopyOperationsList({ operations, onCancel }: CopyOperationsListProps) {
  const { tasks: backgroundTasks } = useBackgroundTasks({ enabled: operations.length > 0 });
  const tasksById = useMemo(
    () => new Map(backgroundTasks.map(task => [task.id, task])),
    [backgroundTasks]
  );

  if (operations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Copy operations ({operations.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {operations.map(operation => {
          const task = tasksById.get(operation.id);
          const inferredStatus = operation.completedTime
            ? BackgroundTaskStatus.Completed
            : BackgroundTaskStatus.Running;
          const status = task?.status ?? inferredStatus;
          const statusLabel = backgroundTaskStatusLabel(status);
          const canCancel = task ? isActiveBackgroundTask(task) : false;

          const bytesProgress = operation.totalBytes > 0
            ? (operation.copiedBytes / Math.max(1, operation.totalBytes)) * 100
            : 0;
          const progressValue = clampProgress(task ? task.progress : bytesProgress);
          const progressLabel = progressValue.toFixed(1);

          const statusMessage = task?.statusMessage ?? operation.currentPath ?? null;
          const errorMessage = task?.errorMessage ?? null;

          const showEta = typeof operation.estimatedTimeSeconds === "number"
            && isFinite(operation.estimatedTimeSeconds)
            && operation.estimatedTimeSeconds >= 0;

          return (
            <div key={operation.id} className="space-y-3 rounded-lg border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn("text-xs", statusBadgeClass[status])}
                  >
                    {statusLabel}
                  </Badge>
                  {canCancel && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onCancel(operation.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Started at {new Date(operation.startTime).toLocaleTimeString()}
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium text-foreground">From:</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{operation.sourcePath}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">To:</span>{" "}
                  <span className="font-mono text-xs text-muted-foreground">{operation.destinationPath}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatSize(operation.copiedBytes)} / {formatSize(operation.totalBytes)}
                    {operation.isDirectory && operation.totalFiles && (
                      <span className="ml-2">
                        ({operation.copiedFiles ?? 0} / {operation.totalFiles} files)
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{progressLabel}%</span>
                    {typeof operation.speedBytesPerSecond === "number"
                      && operation.speedBytesPerSecond > 0 && (
                        <span>• {formatRate(operation.speedBytesPerSecond)}</span>
                      )}
                    {showEta && (
                      <span>• ETA {formatDuration(operation.estimatedTimeSeconds!)}</span>
                    )}
                  </span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>

              {statusMessage && (
                <div className="text-xs text-muted-foreground">{statusMessage}</div>
              )}

              {status === BackgroundTaskStatus.Completed && (
                <div className="text-xs text-green-600 dark:text-green-400">
                  Completed {formatSize(operation.totalBytes)}
                  {operation.isDirectory && operation.totalFiles && (
                    <span> ({operation.totalFiles} files)</span>
                  )}
                  {operation.completedTime && (
                    <span>
                      {" "}in{" "}
                      {Math.max(
                        0,
                        Math.round(
                          (new Date(operation.completedTime).getTime() -
                            new Date(operation.startTime).getTime()) /
                            1000
                        )
                      )}s
                    </span>
                  )}
                </div>
              )}

              {status === BackgroundTaskStatus.Failed && errorMessage && (
                <div className="text-xs text-destructive">Failed: {errorMessage}</div>
              )}

              {status === BackgroundTaskStatus.Cancelled && (
                <div className="text-xs text-muted-foreground">Operation was cancelled</div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

