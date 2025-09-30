"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, Magnet, Pause, Play, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { formatSize, formatRate, formatPercentage } from "../../../lib/utils/format";
import { TorrentState, type TorrentInfo } from "../../../types";
import { TorrentFile } from "../../../types/torrent";

interface TorrentListProps {
  torrents: TorrentInfo[];
  onDelete?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onStart?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onStop?: (hash: string) => Promise<{ success: boolean; message: string }>;
  onPause?: (hash: string) => Promise<{ success: boolean; message: string }>;
}

export default function TorrentList({
  torrents,
  onDelete,
  onStart,
  onStop,
  onPause,
}: TorrentListProps) {
  const handleDelete = async (hash: string, name: string) => {
    if (!onDelete) return;

    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await onDelete(hash);
    }
  };

  const handleStart = async (hash: string) => {
    if (!onStart) return;
    await onStart(hash);
  };

  const handleStop = async (hash: string) => {
    if (!onStop) return;
    await onStop(hash);
  };

  const handlePause = async (hash: string) => {
    if (!onPause) return;
    await onPause(hash);
  };

  if (torrents.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Magnet className="size-7 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">No torrents yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Upload a torrent file to start downloading and keep track of its progress here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">Active Torrents</h2>
          <p className="text-sm text-muted-foreground">
            Monitor download progress and manage actions for each torrent.
          </p>
        </div>
        <Badge variant="secondary" className="self-start px-3 py-1 text-xs font-semibold">
          {torrents.length} active
        </Badge>
      </div>

      <div className="grid gap-4">
        {torrents.map((torrent) => (
          <TorrentCard
            key={torrent.hash}
            torrent={torrent}
            onDelete={
              onDelete ? () => handleDelete(torrent.hash, torrent.name) : undefined
            }
            onStart={onStart ? () => handleStart(torrent.hash) : undefined}
            onStop={onStop ? () => handleStop(torrent.hash) : undefined}
            onPause={onPause ? () => handlePause(torrent.hash) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

interface TorrentCardProps {
  torrent: TorrentInfo;
  onDelete?: (() => Promise<void>) | undefined;
  onStart?: (() => Promise<void>) | undefined;
  onStop?: (() => Promise<void>) | undefined;
  onPause?: (() => Promise<void>) | undefined;
}

function TorrentCard({ torrent, onDelete, onStart, onStop, onPause }: TorrentCardProps) {
  const [filesOpen, setFilesOpen] = useState(false);

  const isRunning =
    torrent.state === TorrentState.Downloading ||
    torrent.state === TorrentState.Seeding;

  const statusInfo = getStatusInfo(torrent.state);
  const showTransferRates =
    torrent.state === TorrentState.Downloading || torrent.state === TorrentState.Seeding;
  const hasEta = torrent.progress > 0 && torrent.estimatedTimeSeconds != null;

  const toggleFiles = () => setFilesOpen((prev) => !prev);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <CardTitle className="text-base font-semibold leading-tight">
            {torrent.name}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
            <span>
              {formatSize(torrent.downloaded)} / {formatSize(torrent.size)}
            </span>
            <span className="hidden text-muted-foreground sm:inline">•</span>
            <span>{formatPercentage(torrent.progress)} complete</span>
            {showTransferRates && (
              <>
                <span className="hidden text-muted-foreground sm:inline">•</span>
                <span>
                  ↓ {formatRate(torrent.downloadRate)} ↑ {formatRate(torrent.uploadRate)}
                </span>
                <span className="hidden text-muted-foreground sm:inline">•</span>
                <span>ETA {hasEta ? formatDuration(torrent.estimatedTimeSeconds!) : "—"}</span>
              </>
            )}
          </CardDescription>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "border px-3 py-1 text-xs font-medium capitalize",
            statusInfo.badgeClass
          )}
        >
          {statusInfo.label}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Metric label="Downloaded" value={`${formatSize(torrent.downloaded)} of ${formatSize(torrent.size)}`} />
          <Metric
            label="Transfer"
            value={
              showTransferRates ? (
                <span>
                  ↓ {formatRate(torrent.downloadRate)} • ↑ {formatRate(torrent.uploadRate)}
                </span>
              ) : (
                "—"
              )
            }
          />
          <Metric label="Files" value={`${torrent.files.length}`} />
        </div>

        {torrent.files.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/30">
            <button
              type="button"
              onClick={toggleFiles}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-sm font-medium transition hover:bg-muted"
            >
              <span>Files ({torrent.files.length})</span>
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  filesOpen && "rotate-180"
                )}
                aria-hidden="true"
              />
            </button>
            {filesOpen && (
              <ScrollArea className="h-44 border-t border-border bg-background/80">
                <ul className="divide-y divide-border/70">
                  {torrent.files.map((file: TorrentFile) => (
                    <li key={file.path} className="px-4 py-3 text-xs">
                      <p className="truncate font-medium" title={file.path}>
                        {file.path}
                      </p>
                      <p className="text-muted-foreground">
                        {formatSize(file.downloaded)} of {formatSize(file.size)}
                      </p>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-4 border-t border-border/80 bg-muted/20 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="w-full space-y-2 sm:flex-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{formatPercentage(torrent.progress)}</span>
          </div>
          <Progress value={torrent.progress} className="h-2" />
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {isRunning && onPause && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPause}
              aria-label={`Pause ${torrent.name}`}
              title="Pause torrent"
            >
              <Pause className="size-4" aria-hidden="true" />
            </Button>
          )}
          {isRunning && onStop && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStop}
              aria-label={`Stop ${torrent.name}`}
              title="Stop torrent"
            >
              <Square className="size-4" aria-hidden="true" />
            </Button>
          )}
          {!isRunning && torrent.state !== TorrentState.Stopping && onStart && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onStart}
              aria-label={`Start ${torrent.name}`}
              title="Start torrent"
            >
              <Play className="size-4" aria-hidden="true" />
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={`Delete ${torrent.name}`}
              title="Delete torrent"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function getStatusInfo(state: TorrentState): { label: string; badgeClass: string } {
  switch (state) {
    case TorrentState.Downloading:
    case TorrentState.Seeding:
    case TorrentState.Starting:
      return {
        label: "Downloading",
        badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
      };
    case TorrentState.Paused:
    case TorrentState.Hashing:
    case TorrentState.HashingPaused:
    case TorrentState.Stopping:
    case TorrentState.Metadata:
    case TorrentState.FetchingHashes:
      return {
        label: "Queued",
        badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-600",
      };
    case TorrentState.Error:
      return {
        label: "Error",
        badgeClass: "border-destructive/30 bg-destructive/20 text-destructive",
      };
    case TorrentState.Stopped:
    default:
      return {
        label: "Stopped",
        badgeClass: "border-border bg-muted text-muted-foreground",
      };
  }
}

function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const secs = Math.round(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const mm = minutes.toString().padStart(2, "0");
  const ss = seconds.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}
