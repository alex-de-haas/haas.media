"use client";

import { useMemo } from "react";
import { ArrowRight, Cpu } from "lucide-react";
import { useEncodingProcesses } from "@/features/media/hooks";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";
import type { EncodingProcessInfo } from "@/types/encoding";
import { Button } from "../ui/button";
import Link from "next/link";

const clampProgress = (value: number): number => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

export function EncodingDashboardWidget() {
  const { encodings, loading, error } = useEncodingProcesses();

  const metrics = useMemo(() => computeMetrics(encodings), [encodings]);

  const hasEncodings = Boolean(encodings && encodings.length > 0);
  const showSkeleton = loading && !hasEncodings;

  return (
    <Card className="border-muted">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </span>
              Encoding status
            </CardTitle>
            <CardDescription>Live summary of active encoders from the downloader worker.</CardDescription>
          </div>
          <Badge variant={hasEncodings ? "secondary" : "outline"} className="px-3">
            {showSkeleton ? <Skeleton className="h-4 w-10" /> : hasEncodings ? `${metrics.count} active` : "Idle"}
          </Badge>
        </div>
        {!showSkeleton && hasEncodings && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Average progress</span>
              <span>{metrics.averageProgress.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.averageProgress} aria-label="Average encoding progress" className="h-2" />
            <p className="text-xs text-muted-foreground">
              {metrics.nextCompletion != null
                ? `Next completion in ${formatDuration(metrics.nextCompletion)}`
                : "Calculating completion estimate"}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton ? <WidgetSkeleton /> : hasEncodings ? <StatsSummary metrics={metrics} /> : <EmptyState error={error} />}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <Button variant="outline" asChild>
          <Link href="/encodings">
            View all encodings
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState({ error }: { error: string | null }) {
  return (
    <div className="rounded-md border border-dashed border-muted bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {error ? error : "No active encodings running right now."}
    </div>
  );
}

function StatsSummary({ metrics }: { metrics: ReturnType<typeof computeMetrics> }) {
  const { count, longestElapsed, averageProgress, nextCompletion } = metrics;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Active encodings" value={count.toString()} description="Tracked across all workers." />
        <StatTile label="Average progress" value={`${averageProgress.toFixed(1)}%`} description="Updated with every SignalR event." />
        <StatTile
          label="Next completion"
          value={nextCompletion != null ? formatDuration(nextCompletion) : "Estimating…"}
          description={longestElapsed != null ? `Longest running ${formatDuration(longestElapsed)}` : "Waiting for progress data."}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Live updates arrive directly from the downloader worker. Encoders disappear as soon as jobs finish.
      </p>
    </div>
  );
}

function StatTile({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-primary/20 bg-primary/5 p-3">
      <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-lg font-semibold text-foreground">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function WidgetSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-2 w-full" />
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-dashed border-muted p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

function computeMetrics(encodings: EncodingProcessInfo[] | null) {
  if (!encodings || encodings.length === 0) {
    return {
      count: 0,
      averageProgress: 0,
      nextCompletion: null as number | null,
      longestElapsed: null as number | null,
    };
  }

  const progressValues = encodings.map((encoding) => clampProgress(encoding.progress));
  const averageProgress = progressValues.reduce((total, value) => total + value, 0) / progressValues.length;
  const longestElapsed = encodings.length > 0 ? Math.max(...encodings.map((encoding) => Math.max(0, encoding.elapsedTimeSeconds))) : null;

  const nextCompletionCandidates = encodings
    .map((encoding) => (encoding.progress > 0 ? Math.max(0, encoding.estimatedTimeSeconds) : Infinity))
    .filter((value) => Number.isFinite(value) && value > 0);

  const nextCompletion = nextCompletionCandidates.length > 0 ? Math.min(...nextCompletionCandidates) : null;

  return {
    count: encodings.length,
    averageProgress,
    nextCompletion,
    longestElapsed,
  };
}
