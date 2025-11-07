"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { cn, formatDuration } from "@/lib/utils";
import type { BackgroundTaskInfo } from "@/types";
import { BackgroundTaskStatus, isActiveBackgroundTask } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, Loader2, XCircle, Ban, Clock } from "lucide-react";

interface BackgroundTaskCardProps {
  task: BackgroundTaskInfo;
  onCancel?: (taskId: string) => Promise<{ success: boolean; message?: string }>;
  showTimestamps?: boolean;
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
    case BackgroundTaskStatus.Pending:
      return <Clock className="h-4 w-4" />;
    default:
      return <Loader2 className="h-4 w-4 animate-spin" />;
  }
};

export function BackgroundTaskCard({ task, onCancel, showTimestamps = true }: BackgroundTaskCardProps) {
  const t = useTranslations("backgroundTasks");
  
  const style = statusStyles[task.status] ?? statusStyles[BackgroundTaskStatus.Running];
  const isActive = isActiveBackgroundTask(task);
  const canCancel = isActive && !!onCancel;
  const progressValue = clampProgress(task.progress);
  const progressPercentage = Math.round(progressValue);
  
  const statusLabel = useMemo(() => {
    switch (task.status) {
      case BackgroundTaskStatus.Pending:
        return t("pending");
      case BackgroundTaskStatus.Running:
        return t("running");
      case BackgroundTaskStatus.Completed:
        return t("completed");
      case BackgroundTaskStatus.Failed:
        return t("failed");
      case BackgroundTaskStatus.Cancelled:
        return t("cancelled");
      default:
        return t("unknown");
    }
  }, [task.status, t]);

  const duration = useMemo(() => {
    if (!task.startedAt) return null;
    const endTime = task.completedAt ? new Date(task.completedAt).getTime() : Date.now();
    const startTime = new Date(task.startedAt).getTime();
    const durationSeconds = Math.max(0, Math.round((endTime - startTime) / 1000));
    return formatDuration(durationSeconds);
  }, [task.startedAt, task.completedAt]);

  const startedAt = task.startedAt ? new Date(task.startedAt).toLocaleTimeString() : null;
  const completedAt = task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : null;

  const alertVariant = task.status === BackgroundTaskStatus.Failed ? "destructive" : "default";
  const showAlert = task.status === BackgroundTaskStatus.Failed || task.status === BackgroundTaskStatus.Cancelled || task.statusMessage;

  const alertTitleText = useMemo(() => {
    switch (task.status) {
      case BackgroundTaskStatus.Failed:
        return t("taskFailed");
      case BackgroundTaskStatus.Cancelled:
        return t("taskCancelled");
      default:
        return t("statusLabel");
    }
  }, [task.status, t]);

  const alertDescription = useMemo(() => {
    if (task.status === BackgroundTaskStatus.Failed) {
      return task.errorMessage ?? task.statusMessage ?? t("taskError");
    }
    if (task.status === BackgroundTaskStatus.Cancelled) {
      return task.statusMessage ?? t("taskCancelledMessage");
    }
    return task.statusMessage;
  }, [task.status, task.errorMessage, task.statusMessage, t]);

  return (
    <Card className={cn("overflow-hidden border shadow-sm transition-colors", style.card)}>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className={cn("flex items-center gap-2 text-base", style.title)}>
            {statusIcon(task.status)}
            {task.name}
          </CardTitle>
          {canCancel && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                void onCancel(task.id);
              }}
            >
              {t("cancelButton")}
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{statusLabel}</span>
          {isActive && <span>• {progressPercentage}%</span>}
          {duration && <span>• {duration}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isActive && (
          <div className="space-y-2">
            <Progress value={progressValue} className="h-2" />
          </div>
        )}

        {showTimestamps && (startedAt || completedAt) && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              {startedAt && <span>{t("startedAt", { time: startedAt })}</span>}
              {completedAt && <span>• {t("finishedAt", { time: completedAt })}</span>}
            </div>
          </div>
        )}

        {showAlert && alertDescription && (
          <Alert variant={alertVariant}>
            <AlertTitle>{alertTitleText}</AlertTitle>
            <AlertDescription className="break-words text-xs">{alertDescription}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
