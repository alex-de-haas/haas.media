"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import { streamFeaturesToStrings } from "@/types/media-info";
import {
  streamTypeIcon,
  streamCodecIcon,
  resolutionIcon,
} from "@/components/media/icons";

interface Props {
  mediaFiles: MediaFileInfo[];
  selectedStreams: Record<string, Set<number>>;
  setSelectedStreams: React.Dispatch<
    React.SetStateAction<Record<string, Set<number>>>
  >;
  encoding: boolean;
}

export default function MediaFilesList({
  mediaFiles,
  selectedStreams,
  setSelectedStreams,
  encoding,
}: Props) {
  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

  // Helper functions for selecting streams
  const selectAllStreamsInFile = (filePath: string, streams: any[]) => {
    setSelectedStreams((prev) => ({
      ...prev,
      [filePath]: new Set(streams.map((s) => s.index)),
    }));
  };

  const deselectAllStreamsInFile = (filePath: string) => {
    setSelectedStreams((prev) => ({
      ...prev,
      [filePath]: new Set(),
    }));
  };

  const selectAllStreams = () => {
    const newSelection: Record<string, Set<number>> = {};
    mediaFiles.forEach((mf) => {
      const streams = (mf as any).mediaInfo?.streams || [];
      newSelection[mf.relativePath] = new Set(streams.map((s: any) => s.index));
    });
    setSelectedStreams(newSelection);
  };

  const deselectAllStreams = () => {
    const newSelection: Record<string, Set<number>> = {};
    mediaFiles.forEach((mf) => {
      newSelection[mf.relativePath] = new Set();
    });
    setSelectedStreams(newSelection);
  };

  return (
    <div className="space-y-6">
      {mediaFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 self-center mr-4">
            Global Selection:
          </div>
          <button
            type="button"
            disabled={encoding}
            onClick={selectAllStreams}
            className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select All Streams
          </button>
          <button
            type="button"
            disabled={encoding}
            onClick={deselectAllStreams}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
          >
            Deselect All
          </button>
        </div>
      )}
      {mediaFiles.length === 0 && (
        <div className="text-sm text-gray-500">No media files found.</div>
      )}
      {mediaFiles.map((mf) => {
        const streams = (mf as any).mediaInfo?.streams || [];
        const fileSelection = selectedStreams[mf.relativePath] || new Set();
        const allStreamsSelected =
          streams.length > 0 &&
          streams.every((s: any) => fileSelection.has(s.index));
        const someStreamsSelected = streams.some((s: any) =>
          fileSelection.has(s.index)
        );

        return (
          <div
            key={mf.relativePath}
            className="border rounded p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div
                className="text-sm font-medium truncate"
                title={mf.relativePath}
              >
                {mf.name}
              </div>
              <div className="text-xs text-gray-500">
                {new Date(mf.lastModified).toLocaleString()}
              </div>
            </div>

            {streams.length > 0 && (
              <div className="mt-3 mb-2 flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-600">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="h-3 w-3 cursor-pointer accent-blue-600"
                    disabled={encoding}
                    checked={allStreamsSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          someStreamsSelected && !allStreamsSelected;
                      }
                    }}
                    onChange={() => {
                      if (allStreamsSelected) {
                        deselectAllStreamsInFile(mf.relativePath);
                      } else {
                        selectAllStreamsInFile(mf.relativePath, streams);
                      }
                    }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    All streams in this file
                  </span>
                </label>
              </div>
            )}

            {streams.length > 0 && (
              <div className="mt-2 space-y-2">
                {streams.map((s: any) => {
                  const features = streamFeaturesToStrings(s.features);
                  const checked =
                    selectedStreams[mf.relativePath]?.has(s.index) ?? false;
                  return (
                    <div
                      key={s.index}
                      className="p-2 rounded bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-1"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-blue-600"
                          disabled={encoding}
                          checked={checked}
                          onChange={() => {
                            setSelectedStreams((prev) => {
                              const current = new Set(
                                prev[mf.relativePath] ?? []
                              );
                              if (current.has(s.index)) current.delete(s.index);
                              else current.add(s.index);
                              return { ...prev, [mf.relativePath]: current };
                            });
                          }}
                        />
                        <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                          {streamTypeIcon(s.type)}
                          {streamCodecIcon(s.codec)}
                          {s.width &&
                            s.height &&
                            resolutionIcon(s.width, s.height)}
                          {features.map((f: string) => (
                            <span
                              key={f}
                              className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px]"
                            >
                              {f}
                            </span>
                          ))}
                          {s.language && (
                            <span className="px-1 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-[10px]">
                              {s.language}
                            </span>
                          )}
                          <span>{s.title}</span>
                          {s.duration && s.type !== 3 && (
                            <div>Duration: {s.duration}</div>
                          )}
                          {typeof s.bitRate === "number" && s.type !== 3 && (
                            <div>
                              Bitrate: {(s.bitRate / 1000).toFixed(0)} KB/s
                            </div>
                          )}
                          {typeof s.channels === "number" && (
                            <div>Channels: {s.channels}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
