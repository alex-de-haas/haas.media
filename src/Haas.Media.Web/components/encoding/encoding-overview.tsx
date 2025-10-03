"use client";

import * as React from "react";
import type { EncodingProcessInfo } from "@/types/encoding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";

interface EncodingOverviewProps {
  encodings: EncodingProcessInfo[] | null;
  loading: boolean;
}

export function EncodingOverview({ encodings, loading }: EncodingOverviewProps) {
  const metrics = React.useMemo(() => {
    const items = encodings ?? [];
    const count = items.length;
    const clampedProgress = items.map((x) => clampProgress(x.progress));
    const averageProgress = count > 0 ? clampedProgress.reduce((total, value) => total + value, 0) / count : 0;

    const elapsed = items.map((x) => Math.max(0, x.elapsedTimeSeconds));
    const longestElapsed = elapsed.length > 0 ? Math.max(...elapsed) : null;

    const completionCandidates = items
      .map((x) => (x.progress > 0 ? Math.max(0, x.estimatedTimeSeconds) : Infinity))
      .filter((value) => Number.isFinite(value) && value > 0);
    const nextCompletion = completionCandidates.length > 0 ? Math.min(...completionCandidates) : null;

    return {
      count,
      averageProgress,
      longestElapsed,
      nextCompletion,
    } as const;
  }, [encodings]);

  const showSkeleton = loading && (!encodings || encodings.length === 0);
  const noData = !encodings || encodings.length === 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active encodings</CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {showSkeleton ? <Skeleton className="h-7 w-16" /> : metrics.count}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">Encodings currently tracked by the downloader worker.</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Average progress</CardDescription>
          <CardTitle className="flex items-baseline gap-2 text-3xl font-semibold">
            {showSkeleton ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <>
                {metrics.averageProgress.toFixed(1)}
                <span className="text-sm font-normal text-muted-foreground">%</span>
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {showSkeleton ? (
            <Skeleton className="h-2 w-full" />
          ) : (
            <Progress value={metrics.averageProgress} aria-label="Average encoding progress" />
          )}
          <p className="mt-3 text-xs text-muted-foreground">Progress across all active encodings.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Next completion</CardDescription>
          <CardTitle className="text-2xl font-semibold">
            {showSkeleton ? (
              <Skeleton className="h-7 w-24" />
            ) : metrics.nextCompletion ? (
              formatDuration(metrics.nextCompletion)
            ) : (
              <span className="text-base font-normal text-muted-foreground">Awaiting progress</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-4 w-32" />
          ) : metrics.longestElapsed != null ? (
            <>Longest running job: {formatDuration(metrics.longestElapsed)}</>
          ) : noData ? (
            <span>No active jobs</span>
          ) : (
            <span>Tracking progress…</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}
