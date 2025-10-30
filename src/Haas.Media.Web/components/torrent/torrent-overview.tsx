"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatRate } from "@/lib/utils";
import type { TorrentInfo } from "@/types";
import { ACTIVE_TORRENT_STATES } from "./constants";

interface TorrentOverviewProps {
  torrents: TorrentInfo[];
  loading: boolean;
}

export function TorrentOverview({ torrents, loading }: TorrentOverviewProps) {
  const t = useTranslations("torrents");
  const metrics = React.useMemo(() => {
    const items = torrents ?? [];
    const total = items.length;
    const active = items.filter((torrent) => ACTIVE_TORRENT_STATES.has(torrent.state)).length;
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
          <CardDescription>{t("activeTorrents")}</CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight">
            {showSkeleton ? <Skeleton className="h-7 w-16" /> : metrics.active}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 text-sm text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-4 w-32" />
          ) : metrics.total > 0 ? (
            <>{t("trackingTotal", { count: metrics.total, plural: metrics.total === 1 ? "" : "s" })}</>
          ) : (
            <>{t("noTorrentsTracked")}</>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("averageProgress")}</CardDescription>
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
            <Progress value={metrics.averageProgress} aria-label={t("averageProgress")} />
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t("progressAcrossAll")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("nextCompletion")}</CardDescription>
          <CardTitle className="text-2xl font-semibold">
            {showSkeleton ? (
              <Skeleton className="h-7 w-24" />
            ) : metrics.nextCompletion ? (
              formatDuration(metrics.nextCompletion)
            ) : noTorrents ? (
              <span className="text-base font-normal text-muted-foreground">{t("noTorrentsQueued")}</span>
            ) : (
              <span className="text-base font-normal text-muted-foreground">{t("awaitingProgress")}</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 pt-0 text-sm text-muted-foreground">
          {showSkeleton ? (
            <Skeleton className="h-4 w-32" />
          ) : metrics.totalDownloadRate > 0 || metrics.totalUploadRate > 0 ? (
            <>
              <p>
                {t("totalDownload")}: <span className="font-medium text-foreground">{formatRate(metrics.totalDownloadRate)}</span>
              </p>
              <p>
                {t("totalUpload")}: <span className="font-medium text-foreground">{formatRate(metrics.totalUploadRate)}</span>
              </p>
            </>
          ) : noTorrents ? (
            <span>{t("noActiveTransfers")}</span>
          ) : (
            <span>{t("monitoringActivity")}</span>
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
