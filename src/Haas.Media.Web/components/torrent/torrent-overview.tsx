"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRate } from "@/lib/utils";
import type { TorrentInfo } from "@/types";
import { TorrentState } from "@/types";

interface TorrentOverviewProps {
  torrents: TorrentInfo[];
  loading: boolean;
}

const ACTIVE_STATES = new Set([
  TorrentState.Downloading,
  TorrentState.Seeding,
  TorrentState.Starting,
  TorrentState.Hashing,
  TorrentState.HashingPaused,
  TorrentState.Metadata,
  TorrentState.FetchingHashes,
]);

export function TorrentOverview({ torrents, loading }: TorrentOverviewProps) {
  const metrics = React.useMemo(() => {
    const items = torrents ?? [];
    const total = items.length;
    const active = items.filter((torrent) => ACTIVE_STATES.has(torrent.state)).length;
    const clampedProgress = items.map((torrent) => clampProgress(torrent.progress));
    const averageProgress = total > 0 ? clampedProgress.reduce((sum, value) => sum + value, 0) / total : 0;

    const completionCandidates = items
      .map((torrent) =>
        torrent.progress > 0 && torrent.estimatedTimeSeconds != null ? Math.max(0, torrent.estimatedTimeSeconds) : Infinity,
      )
      .filter((value) => Number.isFinite(value) && value > 0);
    const nextCompletion = completionCandidates.length > 0 ? Math.min(...completionCandidates) : null;

    const totalDownloadRate = items.reduce((sum, torrent) => sum + Math.max(0, torrent.downloadRate ?? 0), 0);
    const totalUploadRate = items.reduce((sum, torrent) => sum + Math.max(0, torrent.uploadRate ?? 0), 0);

    return {
      total,
      active,
      averageProgress,
      nextCompletion,
      totalDownloadRate,
      totalUploadRate,
    } as const;
  }, [torrents]);

  const showSkeleton = loading && torrents.length === 0;
  const noTorrents = torrents.length === 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Active torrents</CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {showSkeleton ? <Skeleton className="h-7 w-16" /> : metrics.active}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-4 w-32" />
          ) : metrics.total > 0 ? (
            <>Tracking {metrics.total} torrent{metrics.total === 1 ? "" : "s"} in total.</>
          ) : (
            <>No torrents are currently being tracked.</>
          )}
        </CardContent>
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
            <Progress value={metrics.averageProgress} aria-label="Average torrent progress" />
          )}
          <p className="mt-3 text-xs text-muted-foreground">Progress across all tracked torrents.</p>
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
            ) : noTorrents ? (
              <span className="text-base font-normal text-muted-foreground">No torrents queued</span>
            ) : (
              <span className="text-base font-normal text-muted-foreground">Awaiting progress</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-4 w-32" />
          ) : metrics.totalDownloadRate > 0 || metrics.totalUploadRate > 0 ? (
            <>
              <p>
                Total download: <span className="font-medium text-foreground">{formatRate(metrics.totalDownloadRate)}</span>
              </p>
              <p>
                Total upload: <span className="font-medium text-foreground">{formatRate(metrics.totalUploadRate)}</span>
              </p>
            </>
          ) : noTorrents ? (
            <span>No active transfers</span>
          ) : (
            <span>Monitoring torrent activity…</span>
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
