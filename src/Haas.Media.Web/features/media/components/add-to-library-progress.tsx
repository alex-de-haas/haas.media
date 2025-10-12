"use client";

import { useMemo } from "react";
import { useBackgroundTasks } from "@/features/background-tasks/hooks/useBackgroundTasks";
import { BackgroundTaskStatus, backgroundTaskStatusLabel } from "@/types";
import type { AddToLibraryOperationInfo } from "@/types/metadata";
import { LibraryType } from "@/types/library";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { Film, Tv, Loader2, Clock } from "lucide-react";

interface AddToLibraryProgressProps {
  libraryType: LibraryType;
}

const clampProgress = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value));
};

const statusBadgeClass: Record<BackgroundTaskStatus, string> = {
  [BackgroundTaskStatus.Pending]: "border-amber-200 bg-amber-500/10 text-amber-600 dark:border-amber-400/20 dark:text-amber-300",
  [BackgroundTaskStatus.Running]: "border-blue-200 bg-blue-500/10 text-blue-600 dark:border-blue-400/20 dark:text-blue-300",
  [BackgroundTaskStatus.Completed]:
    "border-emerald-200 bg-emerald-500/10 text-emerald-600 dark:border-emerald-400/20 dark:text-emerald-300",
  [BackgroundTaskStatus.Failed]: "border-destructive/40 bg-destructive/10 text-destructive",
  [BackgroundTaskStatus.Cancelled]: "border-muted bg-muted/40 text-muted-foreground",
};

const statusIcon = (status: BackgroundTaskStatus) => {
  switch (status) {
    case BackgroundTaskStatus.Pending:
      return <Clock className="h-3.5 w-3.5" />;
    case BackgroundTaskStatus.Running:
      return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
    default:
      return <Clock className="h-3.5 w-3.5" />;
  }
};

const mediaTypeIcon = (type: LibraryType) => (type === LibraryType.Movies ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />);

export default function AddToLibraryProgress({ libraryType }: AddToLibraryProgressProps) {
  const { tasks } = useBackgroundTasks({ enabled: true });

  const activeOperations = useMemo(() => {
    return tasks
      .map((task) => {
        if (task.type !== "AddToLibraryTask") {
          return null;
        }

        const payload = task.payload as AddToLibraryOperationInfo | undefined;
        if (!payload || payload.libraryType !== libraryType) {
          return null;
        }

        if (task.status !== BackgroundTaskStatus.Pending && task.status !== BackgroundTaskStatus.Running) {
          return null;
        }

        return { task, payload };
      })
      .filter((value): value is { task: (typeof tasks)[number]; payload: AddToLibraryOperationInfo } => value !== null);
  }, [libraryType, tasks]);

  if (activeOperations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Add to library in progress</h2>
        <Badge variant="outline" className="text-xs">
          {activeOperations.length} {activeOperations.length === 1 ? "item" : "items"}
        </Badge>
      </div>

      <div className="space-y-4">
        {activeOperations.map(({ task, payload }) => {
          const progressValue = clampProgress(task.progress);
          const progressPercentage = Math.round(progressValue);
          const stageLabel = payload.stage || "Processing";
          const statusLabel = backgroundTaskStatusLabel(task.status);
          const statusMessage = task.statusMessage ?? null;
          const infoBadges: string[] = [];

          if (payload.libraryTitle) {
            infoBadges.push(`Library • ${payload.libraryTitle}`);
          }

          if (typeof payload.totalSeasons === "number" && payload.totalSeasons > 0) {
            infoBadges.push(`Seasons ${payload.processedSeasons ?? 0}/${payload.totalSeasons}`);
          }

          if (typeof payload.totalEpisodes === "number" && payload.totalEpisodes > 0) {
            infoBadges.push(`Episodes ${payload.processedEpisodes ?? 0}/${payload.totalEpisodes}`);
          }

          const totalPeople = payload.totalPeople ?? 0;
          if (totalPeople > 0) {
            const syncedPeople = payload.syncedPeople ?? 0;
            const failedPeople = payload.failedPeople ?? 0;
            const label = failedPeople > 0
              ? `People ${syncedPeople}/${totalPeople} (${failedPeople} failed)`
              : `People ${syncedPeople}/${totalPeople}`;
            infoBadges.push(label);
          }

          return (
            <Card key={task.id} className="border-primary/40 bg-primary/5">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-primary">
                    {statusIcon(task.status)}
                    {payload.title ?? "Processing title"}
                  </CardTitle>
                  <Badge variant="outline" className={cn("flex shrink-0 items-center gap-2 text-xs", statusBadgeClass[task.status])}>
                    {mediaTypeIcon(libraryType)}
                    <span>{statusLabel}</span>
                  </Badge>
                </div>
                {infoBadges.length > 0 && (
                  <p className="text-sm text-muted-foreground">{infoBadges.join(" • ")}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progressPercentage}%</span>
                    <span>{statusLabel}</span>
                  </div>
                  <Progress value={progressValue} />
                </div>

                {stageLabel && (
                  <Alert>
                    <AlertTitle>Processing</AlertTitle>
                    <AlertDescription className="truncate">{stageLabel}</AlertDescription>
                  </Alert>
                )}

                {statusMessage && statusMessage !== stageLabel && statusMessage !== statusLabel && (
                  <Alert>
                    <AlertTitle>Status</AlertTitle>
                    <AlertDescription className="truncate">{statusMessage}</AlertDescription>
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
