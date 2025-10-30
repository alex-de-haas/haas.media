"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { cn, formatDuration, formatSize } from "@/lib/utils";
import type { CopyOperationInfo } from "@/types/file";
import { BackgroundTaskStatus, backgroundTaskStatusLabel, isActiveBackgroundTask } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, XCircle, Ban, Clock } from "lucide-react";

interface CopyOperationsListProps {
  operations: CopyOperationInfo[];
  onCancel: (operationId: string) => Promise<{ success: boolean; message: string }>;
}

const clampProgress = (value: number): number => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

const statusStyles: Record<BackgroundTaskStatus, { card: string; title: string }> = {
  [BackgroundTaskStatus.Pending]: {
    card: "border-primary/40 bg-primary/5",
    title: "text-primary",
  },
  [BackgroundTaskStatus.Running]: {
    card: "border-primary/40 bg-primary/5",
    title: "text-primary",
  },
  [BackgroundTaskStatus.Completed]: {
    card: "border-emerald-400/30 bg-emerald-500/5",
    title: "text-emerald-600 dark:text-emerald-300",
  },
  [BackgroundTaskStatus.Failed]: {
    card: "border-destructive/40 bg-destructive/10",
    title: "text-destructive",
  },
  [BackgroundTaskStatus.Cancelled]: {
    card: "border-muted bg-muted/20",
    title: "text-muted-foreground",
  },
};

const statusIcon = (status: BackgroundTaskStatus) => {
  switch (status) {
    case BackgroundTaskStatus.Completed:
      return <CheckCircle2 className="h-4 w-4" />;
    case BackgroundTaskStatus.Failed:
      return <XCircle className="h-4 w-4" />;
    case BackgroundTaskStatus.Cancelled:
      return <Ban className="h-4 w-4" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
};

export default function CopyOperationsList({ operations, onCancel }: CopyOperationsListProps) {
  const t = useTranslations("files.copyOperations");
  const tCommon = useTranslations("common");

  const { tasks: backgroundTasks } = useBackgroundTasks({ enabled: operations.length > 0 });
  const tasksById = useMemo(() => new Map(backgroundTasks.map((task) => [task.id, task])), [backgroundTasks]);

  const statusTitle = (status: BackgroundTaskStatus, operation: CopyOperationInfo, isActive: boolean) => {
    if (isActive) {
      return operation.isDirectory ? t("copyingDirectory") : t("copyingFiles");
    }

    switch (status) {
      case BackgroundTaskStatus.Completed:
        return t("copyCompleted");
      case BackgroundTaskStatus.Failed:
        return t("copyFailed");
      case BackgroundTaskStatus.Cancelled:
        return t("copyCancelled");
      default:
        return t("copyStatus");
    }
  };

  const visibleOperations = useMemo(() => {
    return operations.filter((operation) => {
      const task = tasksById.get(operation.id);
      const inferredStatus = operation.completedTime ? BackgroundTaskStatus.Completed : BackgroundTaskStatus.Running;
      const status = task?.status ?? inferredStatus;
      return status !== BackgroundTaskStatus.Completed;
    });
  }, [operations, tasksById]);

  if (visibleOperations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{t("fileTransfers")}</h2>
        <span className="text-sm text-muted-foreground">{visibleOperations.length}</span>
      </div>
      <div className="space-y-4">
        {visibleOperations.map((operation) => {
          const task = tasksById.get(operation.id);
          const inferredStatus = operation.completedTime ? BackgroundTaskStatus.Completed : BackgroundTaskStatus.Running;
          const status = task?.status ?? inferredStatus;
          const statusLabel = backgroundTaskStatusLabel(status);
          const canCancel = task ? isActiveBackgroundTask(task) : false;
          const style = statusStyles[status] ?? statusStyles[BackgroundTaskStatus.Running];
          const isActive = canCancel || (!operation.completedTime && status !== BackgroundTaskStatus.Cancelled);

          const baseProgress = operation.totalBytes > 0 ? (operation.copiedBytes / Math.max(1, operation.totalBytes)) * 100 : 0;
          const progressValue = clampProgress(task ? task.progress : baseProgress);
          const progressPercentage = Math.round(progressValue);

          const statusMessage = task?.statusMessage ?? operation.currentPath ?? null;
          const errorMessage = task?.errorMessage ?? null;

          const sizeSummary = `${formatSize(operation.copiedBytes)} / ${formatSize(operation.totalBytes)}`;
          const fileSummary =
            operation.isDirectory && operation.totalFiles ? `${operation.copiedFiles ?? 0} / ${operation.totalFiles} files` : null;

          const activeSummary = [sizeSummary, fileSummary].filter(Boolean).join(" • ");

          const completionDurationSeconds = operation.completedTime
            ? Math.max(0, Math.round((new Date(operation.completedTime).getTime() - new Date(operation.startTime).getTime()) / 1000))
            : null;

          const completedSummary = [
            t("copiedSize", { size: formatSize(operation.totalBytes) }),
            operation.isDirectory && operation.totalFiles ? t("copiedFiles", { count: operation.totalFiles }) : null,
            completionDurationSeconds ? t("finishedIn", { duration: formatDuration(completionDurationSeconds) }) : null,
          ]
            .filter(Boolean)
            .join(" • ");

          const summaryText = (isActive ? activeSummary : completedSummary) || statusLabel;

          const startedAt = new Date(operation.startTime).toLocaleTimeString();
          const completedAt = operation.completedTime ? new Date(operation.completedTime).toLocaleTimeString() : null;

          const alertVariant = status === BackgroundTaskStatus.Failed ? "destructive" : "default";
          const alertDescription = (() => {
            if (status === BackgroundTaskStatus.Failed) {
              return errorMessage ?? statusMessage ?? t("transferError");
            }
            if (status === BackgroundTaskStatus.Cancelled) {
              return statusMessage ?? t("operationCancelled");
            }
            return statusMessage;
          })();

          const showAlert = Boolean(alertDescription);

          const alertTitleText = (() => {
            switch (status) {
              case BackgroundTaskStatus.Failed:
                return t("transferFailed");
              case BackgroundTaskStatus.Cancelled:
                return t("transferCancelled");
              default:
                return t("currentFile");
            }
          })();

          return (
            <Card key={operation.id} className={cn("overflow-hidden border shadow-sm transition-colors", style.card)}>
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className={cn("flex items-center gap-2 text-base", style.title)}>
                    {statusIcon(status)}
                    {statusTitle(status, operation, isActive)}
                  </CardTitle>
                  {canCancel && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        void onCancel(operation.id);
                      }}
                    >
                      {tCommon("cancel")}
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{summaryText}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{t("started", { time: startedAt })}</span>
                    {completedAt && <span>• {t("finished", { time: completedAt })}</span>}
                  </div>
                  <div className="grid gap-3 rounded-md border border-border/60 bg-background/80 p-3 sm:grid-cols-2">
                    <div>
                      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{t("source")}</div>
                      <div className="mt-1 break-words font-mono text-[11px] text-foreground sm:text-xs">{operation.sourcePath}</div>
                    </div>
                    <div>
                      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{t("destination")}</div>
                      <div className="mt-1 break-words font-mono text-[11px] text-foreground sm:text-xs">{operation.destinationPath}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressPercentage}%</span>
                    <span>{statusLabel}</span>
                  </div>
                  <Progress value={progressValue} className="h-2" />
                </div>

                {showAlert && (
                  <Alert variant={alertVariant}>
                    <AlertTitle>{alertTitleText}</AlertTitle>
                    <AlertDescription className="break-words text-xs">{alertDescription}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
