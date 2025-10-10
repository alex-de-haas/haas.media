"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import type { MediaStream } from "@/types/media-info";
import { StreamType, streamFeaturesToStrings } from "@/types/media-info";
import { streamTypeIcon, streamCodecIcon, resolutionIcon } from "@/components/encoding";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatFileSize } from "@/lib/utils";

interface Props {
  mediaFiles: MediaFileInfo[];
  selectedStreams: Record<string, Set<number>>;
  setSelectedStreams: React.Dispatch<React.SetStateAction<Record<string, Set<number>>>>;
  encoding: boolean;
}

export default function MediaFilesList({ mediaFiles, selectedStreams, setSelectedStreams, encoding }: Props) {
  const selectAllStreamsInFile = React.useCallback(
    (filePath: string, streams: MediaStream[]) => {
      setSelectedStreams((prev) => ({
        ...prev,
        [filePath]: new Set(streams.map((stream) => stream.index)),
      }));
    },
    [setSelectedStreams],
  );

  const deselectAllStreamsInFile = React.useCallback(
    (filePath: string) => {
      setSelectedStreams((prev) => ({
        ...prev,
        [filePath]: new Set<number>(),
      }));
    },
    [setSelectedStreams],
  );

  if (mediaFiles.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">No media files found</CardTitle>
          <CardDescription>Scan the selected location to populate stream information and encoding options.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        {mediaFiles.map((file) => {
          const streams = file.mediaInfo?.streams ?? [];
          const fileSelection = selectedStreams[file.relativePath] ?? new Set<number>();
          const allSelected = streams.length > 0 && streams.every((stream) => fileSelection.has(stream.index));
          const someSelected = streams.some((stream) => fileSelection.has(stream.index)) && !allSelected;
          const headerChecked = allSelected ? true : someSelected ? "indeterminate" : false;

          return (
            <Card key={file.relativePath} className="overflow-hidden">
              <CardHeader className="gap-2 pb-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">{file.name}</CardTitle>
                    <CardDescription className="truncate">{file.relativePath}</CardDescription>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted-foreground sm:text-right">
                      <div>
                        <dt className="font-medium text-foreground">Size</dt>
                        <dd>{formatFileSize(file.size)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-foreground">Modified</dt>
                        <dd>{formatDate(file.lastModified)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardHeader>
              {streams.length > 0 ? (
                <>
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Checkbox
                          disabled={encoding}
                          checked={headerChecked}
                          onCheckedChange={(value) => {
                            if (value === true || value === "indeterminate") {
                              selectAllStreamsInFile(file.relativePath, streams);
                            } else {
                              deselectAllStreamsInFile(file.relativePath);
                            }
                          }}
                        />
                        <span>Select all streams in this file</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {fileSelection.size}/{streams.length} selected
                      </div>
                    </div>
                    <div className="space-y-4 pr-2">
                      {streams.map((stream) => {
                        const features = streamFeaturesToStrings(stream.features);
                        const checked = fileSelection.has(stream.index);

                        return (
                          <div key={stream.index} className="rounded-lg border border-border bg-background/90 p-3 shadow-sm">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex flex-1 items-start gap-3">
                                <Checkbox
                                  checked={checked}
                                  disabled={encoding}
                                  onCheckedChange={(value) => {
                                    setSelectedStreams((prev) => {
                                      const current = new Set(prev[file.relativePath] ?? []);
                                      if (value === true || value === "indeterminate") {
                                        current.add(stream.index);
                                      } else {
                                        current.delete(stream.index);
                                      }
                                      return { ...prev, [file.relativePath]: current };
                                    });
                                  }}
                                />
                                <div className="space-y-2 text-sm">
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                    {streamTypeIcon(stream.type)}
                                    {streamCodecIcon(stream.codec)}
                                    {resolutionIcon(stream.width ?? undefined, stream.height ?? undefined)}
                                    {features.map((feature) => (
                                      <Badge key={feature} variant="secondary" className="text-[10px]">
                                        {feature}
                                      </Badge>
                                    ))}
                                  </div>
                                  <div className="space-y-1 text-sm">
                                    {stream.title && <div className="font-medium text-foreground">{stream.title}</div>}
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                      <MetadataItem label="Index" value={`#${stream.index}`} />
                                      <MetadataItem label="Language" value={stream.language ?? "—"} />
                                      {stream.duration && <MetadataItem label="Duration" value={stream.duration} />}
                                      {typeof stream.bitRate === "number" && stream.type !== StreamType.Subtitle && (
                                        <MetadataItem label="Bitrate" value={`${(stream.bitRate / 1000).toFixed(0)} kb/s`} />
                                      )}
                                      {typeof stream.channels === "number" && (
                                        <MetadataItem label="Channels" value={String(stream.channels)} />
                                      )}
                                      {typeof stream.sampleRate === "number" && (
                                        <MetadataItem label="Sample rate" value={`${stream.sampleRate} Hz`} />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="pt-0">
                  <div className="rounded-md border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    Stream metadata is not available for this file.
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function MetadataItem({ label, value }: { label: string; value: string }) {
  return (
    <span>
      <span className="font-medium text-foreground/80">{label}:</span> {value}
    </span>
  );
}
