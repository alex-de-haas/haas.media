"use client";

import * as React from "react";
import type { EncodingProcessInfo } from "@/types/encoding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration } from "@/lib/utils";

interface EncodingQueueProps {
  encodings: EncodingProcessInfo[] | null;
  loading: boolean;
  stoppingId: string | null;
  onStop: (hash: string) => void | Promise<void>;
}

export function EncodingQueue({ encodings, loading, stoppingId, onStop }: EncodingQueueProps) {
  const hasData = Boolean(encodings && encodings.length > 0);
  const showSkeleton = loading && !hasData;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg font-semibold">Encoding queue</CardTitle>
          <CardDescription>Live view of encodings managed by the downloader.</CardDescription>
        </div>
        {hasData && (
          <Badge variant="secondary" className="self-start sm:self-auto">
            {encodings!.length} active
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {showSkeleton ? (
          <EncodingQueueSkeleton />
        ) : hasData ? (
          <EncodingTable encodings={encodings!} stoppingId={stoppingId} onStop={onStop} />
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

interface EncodingTableProps {
  encodings: EncodingProcessInfo[];
  stoppingId: string | null;
  onStop: (hash: string) => void | Promise<void>;
}

function EncodingTable({ encodings, stoppingId, onStop }: EncodingTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Output</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="hidden md:table-cell">Elapsed</TableHead>
          <TableHead className="hidden md:table-cell">ETA</TableHead>
          <TableHead className="w-[120px] text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {encodings.map((encoding) => {
          const progress = clampProgress(encoding.progress);
          const status = getStatus(progress);
          const isStopping = stoppingId === encoding.id;
          const hasEta = progress > 0 && encoding.estimatedTimeSeconds > 0;

          return (
            <TableRow key={`${encoding.id}-${encoding.outputPath}`}>
              <TableCell className="max-w-[260px] align-top">
                <div className="flex flex-col gap-1">
                  <span className="truncate font-medium">
                    {getFileName(encoding.outputPath)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={encoding.sourcePath}>
                    Source: {encoding.sourcePath}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={encoding.outputPath}>
                    Output: {encoding.outputPath}
                  </span>
                </div>
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col gap-3">
                  <Badge variant={status.variant} className="w-max">
                    {status.label}
                  </Badge>
                  <div className="space-y-1">
                    <Progress value={progress} aria-label={`Progress for ${encoding.outputPath}`} />
                    <p className="text-xs text-muted-foreground">{progress.toFixed(1)}%</p>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">
                <div className="text-sm font-medium">{formatDuration(encoding.elapsedTimeSeconds)}</div>
                <div className="text-xs text-muted-foreground">elapsed</div>
              </TableCell>
              <TableCell className="hidden align-top md:table-cell">
                {hasEta ? (
                  <>
                    <div className="text-sm font-medium">{formatDuration(encoding.estimatedTimeSeconds)}</div>
                    <div className="text-xs text-muted-foreground">remaining</div>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">calculating…</span>
                )}
              </TableCell>
              <TableCell className="align-top text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={isStopping}
                  onClick={() => onStop(encoding.id)}
                >
                  {isStopping ? "Stopping…" : "Stop"}
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function EncodingQueueSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="flex flex-col gap-4 rounded-lg border border-dashed border-muted p-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-52" />
            <Skeleton className="h-3 w-64" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2 w-full max-w-[240px]" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="hidden h-4 w-20 sm:block" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No active encodings</p>
      <p className="max-w-sm">
        Start an encoding job from the media library. Running tasks will appear here with live progress updates.
      </p>
    </div>
  );
}

function getFileName(path: string) {
  const parts = path.split(/[/\\]/g);
  return parts[parts.length - 1] || path;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function getStatus(progress: number) {
  if (progress === 0) {
    return { label: "Queued", variant: "secondary" as const };
  }
  if (progress >= 99.5) {
    return { label: "Finalizing", variant: "outline" as const };
  }
  return { label: "Encoding", variant: "default" as const };
}
