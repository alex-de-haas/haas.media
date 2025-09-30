"use client";

import { cn, formatDuration, formatRate, formatSize } from "@/lib/utils";
import type { CopyOperationInfo } from "@/types/file";
import { CopyOperationState } from "@/types/file";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CopyOperationsListProps {
  operations: CopyOperationInfo[];
  onCancel: (operationId: string) => Promise<{ success: boolean; message: string }>;
}

const stateLabel: Record<CopyOperationState, string> = {
  [CopyOperationState.Running]: "Running",
  [CopyOperationState.Completed]: "Completed",
  [CopyOperationState.Failed]: "Failed",
  [CopyOperationState.Cancelled]: "Cancelled",
};

const stateBadgeClass: Record<CopyOperationState, string> = {
  [CopyOperationState.Running]: "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:text-blue-300",
  [CopyOperationState.Completed]: "border-green-200 bg-green-500/10 text-green-600 dark:border-green-400/20 dark:text-green-300",
  [CopyOperationState.Failed]: "border-red-200 bg-red-500/10 text-red-600 dark:border-red-400/20 dark:text-red-300",
  [CopyOperationState.Cancelled]: "border-muted bg-muted text-muted-foreground",
};

export default function CopyOperationsList({ operations, onCancel }: CopyOperationsListProps) {
  if (operations.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Copy operations ({operations.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {operations.map((operation) => (
          <div key={operation.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("text-xs", stateBadgeClass[operation.state])}>
                  {stateLabel[operation.state] ?? "Unknown"}
                </Badge>
                {operation.state === CopyOperationState.Running && (
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

            {operation.state === CopyOperationState.Running && (
              <div className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatSize(operation.copiedBytes)} / {formatSize(operation.totalBytes)}
                    {operation.isDirectory && operation.totalFiles && (
                      <span className="ml-2">
                        ({operation.copiedFiles || 0} / {operation.totalFiles} files)
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <span>{operation.progress.toFixed(1)}%</span>
                    {typeof operation.speedBytesPerSecond === "number" && operation.speedBytesPerSecond > 0 && (
                      <span>• {formatRate(operation.speedBytesPerSecond)}</span>
                    )}
                    {typeof operation.estimatedTimeSeconds === "number" &&
                      isFinite(operation.estimatedTimeSeconds) &&
                      operation.estimatedTimeSeconds >= 0 && (
                        <span>• ETA {formatDuration(operation.estimatedTimeSeconds)}</span>
                      )}
                  </span>
                </div>
                <Progress value={operation.progress} className="h-2" />
              </div>
            )}

            {operation.state === CopyOperationState.Completed && (
              <div className="text-xs text-green-600 dark:text-green-400">
                Completed {formatSize(operation.totalBytes)}
                {operation.isDirectory && operation.totalFiles && (
                  <span> ({operation.totalFiles} files)</span>
                )}
                {operation.completedTime && (
                  <span>
                    {" "}in{" "}
                    {Math.round(
                      (new Date(operation.completedTime).getTime() -
                        new Date(operation.startTime).getTime()) /
                        1000
                    )}s
                  </span>
                )}
              </div>
            )}

            {operation.state === CopyOperationState.Failed && operation.errorMessage && (
              <div className="text-xs text-destructive">Failed: {operation.errorMessage}</div>
            )}

            {operation.state === CopyOperationState.Cancelled && (
              <div className="text-xs text-muted-foreground">Operation was cancelled</div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
