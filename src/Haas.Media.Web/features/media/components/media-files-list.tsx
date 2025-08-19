"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import { streamFeaturesToStrings, streamTypeToString, streamCodecToString } from "@/types/media-info";
import { streamTypeIcon, streamCodecIcon } from "@/components/media/icons";
import type { StreamType } from "@/types/media-info";

interface Props {
  mediaFiles: MediaFileInfo[];
  selectedStreams: Record<string, Set<number>>;
  setSelectedStreams: React.Dispatch<React.SetStateAction<Record<string, Set<number>>>>;
  encoding: boolean;
}

export default function MediaFilesList({ mediaFiles, selectedStreams, setSelectedStreams, encoding }: Props) {
  const hasAnySelection = React.useMemo(
    () => Object.values(selectedStreams).some((s) => s && s.size > 0),
    [selectedStreams]
  );

  return (
    <div className="space-y-6">
      {mediaFiles.length === 0 && (
        <div className="text-sm text-gray-500">No media files found.</div>
      )}
      {mediaFiles.map((mf) => (
        <div
          key={mf.relativePath}
          className="border rounded p-3 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate" title={mf.relativePath}>
              {mf.name}
            </div>
            <div className="text-xs text-gray-500">{new Date(mf.lastModified).toLocaleString()}</div>
          </div>
          {(mf as any).mediaInfo?.streams?.length > 0 && (
            <div className="mt-2 space-y-2">
              {(mf as any).mediaInfo.streams.map((s: any) => {
                const features = streamFeaturesToStrings(s.features);
                const checked = selectedStreams[mf.relativePath]?.has(s.index) ?? false;
                return (
                  <div key={s.index} className="p-2 rounded bg-gray-50 dark:bg-gray-900/40 flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 cursor-pointer accent-blue-600"
                        disabled={encoding}
                        checked={checked}
                        onChange={() => {
                          setSelectedStreams((prev) => {
                            const current = new Set(prev[mf.relativePath] ?? []);
                            if (current.has(s.index)) current.delete(s.index);
                            else current.add(s.index);
                            return { ...prev, [mf.relativePath]: current };
                          });
                        }}
                      />
                      <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                        {streamTypeIcon(s.type)}
                        {streamCodecIcon(s.codec)}
                        <span>{s.title}</span>
                        {features.map((f: string) => (
                          <span key={f} className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px]">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="mt-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-1 text-[10px] text-gray-600 dark:text-gray-300">
                      <div>Type: {streamTypeToString(s.type)}</div>
                      <div>Codec: {streamCodecToString(s.codec)}</div>
                      {s.duration && <div>Dur: {s.duration}</div>}
                      {s.width && s.height && (
                        <div>{s.width}x{s.height}</div>
                      )}
                      {typeof s.bitRate === "number" && <div>{(s.bitRate/1000).toFixed(0)} KB/s</div>}
                      {typeof s.channels === "number" && <div>Ch: {s.channels}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400">Raw JSON</summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-[10px] overflow-auto max-h-64">{JSON.stringify(mf, null, 2)}</pre>
          </details>
        </div>
      ))}
    </div>
  );
}
