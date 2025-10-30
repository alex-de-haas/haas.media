"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CloudDownload } from "lucide-react";
import { useTranslations } from "next-intl";

import { useTorrents } from "@/features/torrent/hooks";
import type { TorrentInfo } from "@/types";
import { TorrentState } from "@/types";
import { formatDuration, formatRate } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "../ui/button";
import { ACTIVE_TORRENT_STATES } from "./constants";

const clampProgress = (value: number): number => (Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0);

export function TorrentDashboardWidget() {
  const { torrents, loading } = useTorrents();
  const t = useTranslations("dashboard.torrentWidget");

  const metrics = useMemo(() => computeMetrics(torrents), [torrents]);

  const hasTorrents = torrents.length > 0;
  const hasActive = metrics.active > 0;
  const showSkeleton = loading && !hasTorrents;

  return (
    <Card className="border-muted">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CloudDownload className="h-4 w-4" />
              </span>
              {t("title")}
            </CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          <Badge variant={hasActive ? "secondary" : "outline"} className="px-3">
            {showSkeleton ? <Skeleton className="h-4 w-14" /> : hasActive ? t("activeCount", { count: metrics.active }) : t("idle")}
          </Badge>
        </div>
        {!showSkeleton && hasTorrents && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{t("averageProgress")}</span>
              <span>{metrics.averageProgress.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.averageProgress} aria-label={t("averageProgressLabel")} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {metrics.nextCompletion != null
                ? t("nextCompletion", { duration: formatDuration(metrics.nextCompletion) })
                : t("waitingForEstimates")}
            </p>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {showSkeleton ? <WidgetSkeleton /> : hasTorrents ? <StatsSummary metrics={metrics} /> : <EmptyState />}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <Button variant="outline" asChild>
          <Link href="/torrent">
            {t("manageTorrents")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

function EmptyState() {
  const t = useTranslations("dashboard.torrentWidget");
  return (
    <div className="rounded-md border border-dashed border-muted bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
      {t("emptyState")}
    </div>
  );
}

function StatsSummary({ metrics }: { metrics: ReturnType<typeof computeMetrics> }) {
  const { active, total, seeding, totalDownloadRate, totalUploadRate } = metrics;
  const t = useTranslations("dashboard.torrentWidget.stats");

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("activeTorrents")} value={active.toString()} description={t("trackingTotal", { total })} />
        <StatTile label={t("seeding")} value={seeding.toString()} description={t("seedingDesc")} />
        <StatTile label={t("downloadRate")} value={formatRate(totalDownloadRate)} description={t("downloadRateDesc")} />
        <StatTile label={t("uploadRate")} value={formatRate(totalUploadRate)} description={t("uploadRateDesc")} />
      </div>

      <p className="text-xs text-muted-foreground">{t("liveUpdates")}</p>
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-lg border border-dashed border-muted p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

function computeMetrics(torrents: TorrentInfo[]) {
  if (!torrents || torrents.length === 0) {
    return {
      total: 0,
      active: 0,
      seeding: 0,
      averageProgress: 0,
      nextCompletion: null as number | null,
      totalDownloadRate: 0,
      totalUploadRate: 0,
    };
  }

  const total = torrents.length;
  const active = torrents.filter((torrent) => ACTIVE_TORRENT_STATES.has(torrent.state)).length;
  const seeding = torrents.filter((torrent) => torrent.state === TorrentState.Seeding).length;
  const progressValues = torrents.map((torrent) => clampProgress(torrent.progress));
  const averageProgress = progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length;

  const completionCandidates = torrents
    .map((torrent) => (torrent.progress > 0 && torrent.estimatedTimeSeconds != null ? Math.max(0, torrent.estimatedTimeSeconds) : Infinity))
    .filter((value) => Number.isFinite(value) && value > 0);
  const nextCompletion = completionCandidates.length > 0 ? Math.min(...completionCandidates) : null;

  const totalDownloadRate = torrents.reduce((sum, torrent) => sum + Math.max(0, torrent.downloadRate ?? 0), 0);
  const totalUploadRate = torrents.reduce((sum, torrent) => sum + Math.max(0, torrent.uploadRate ?? 0), 0);

  return {
    total,
    active,
    seeding,
    averageProgress,
    nextCompletion,
    totalDownloadRate,
    totalUploadRate,
  };
}
