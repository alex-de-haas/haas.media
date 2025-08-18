"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import {
  streamTypeToString,
  streamCodecToString,
  streamFeaturesToStrings,
} from "@/types/media-info";
import type { StreamType } from "@/types/media-info";
import { streamTypeIcon, streamCodecIcon } from "@/components/media/icons";
import type { MediaFileInfo } from "@/types/media-file-info";

function formatBitrate(bitsPerSecond: number): string {
  if (!Number.isFinite(bitsPerSecond) || bitsPerSecond <= 0) return "-";
  const kbps = bitsPerSecond / 1000; // media contexts usually use decimal SI units
  return `${kbps.toFixed(0)} KB/s`;
}

const API_BASE = process.env.NEXT_PUBLIC_DOWNLOADER_URL;

export default function MediaInfoPage() {
  const [hash, setHash] = React.useState<string>("");

  React.useEffect(() => {
    try {
      const sp = new URLSearchParams(
        typeof window !== "undefined" ? window.location.search : ""
      );
      setHash(sp.get("hash") ?? "");
    } catch (_) {
      setHash("");
    }
  }, []);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = React.useState<MediaFileInfo[] | null>(
    null
  );
  const [selectedStreams, setSelectedStreams] = React.useState<
    Record<string, Set<number>>
  >({});
  const [encoding, setEncoding] = React.useState(false);
  const [encodeResults, setEncodeResults] = React.useState<
    Record<string, string[]>
  >({});
  const [encodeError, setEncodeError] = React.useState<string | null>(null);

  const hasAnySelection = React.useMemo(() => {
    return Object.values(selectedStreams).some((s) => s && s.size > 0);
  }, [selectedStreams]);

  const handleEncodeAll = React.useCallback(async () => {
    if (!mediaFiles) return;
    if (!hasAnySelection) return;
    if (!hash) return;
    if (encoding) return;
    setEncoding(true);
    setEncodeError(null);
    try {
      const aggregatedStreams: Array<{ inputFilePath: string; streamIndex: number; streamType: StreamType }> = [];
      for (const mf of mediaFiles) {
        const sel = selectedStreams[mf.relativePath];
        if (!sel || sel.size === 0) continue;
        for (const idx of sel.values()) {
          const stream = mf.mediaInfo?.streams?.find((st: any) => st.index === idx);
          if (!stream) continue;
          aggregatedStreams.push({
            inputFilePath: mf.relativePath,
            streamIndex: idx,
            streamType: stream.type,
          });
        }
      }
      if (aggregatedStreams.length === 0) return;
      const t = await getValidToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (t) (headers as any).Authorization = `Bearer ${t}`;
      const res = await fetch(`${API_BASE}/api/files/${hash}/encode`, {
        method: "POST",
        headers,
        body: JSON.stringify({ streams: aggregatedStreams }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }
      const data = await res.json();
      const output: string | undefined = data?.output;
      if (output) {
        // Associate the single output with all files that had selections
        const affected = mediaFiles.filter(mf => (selectedStreams[mf.relativePath]?.size ?? 0) > 0);
        setEncodeResults(prev => {
          const next = { ...prev };
          for (const f of affected) {
            next[f.relativePath] = (next[f.relativePath] ?? []).concat([output]);
          }
          return next;
        });
      }
    } catch (err: any) {
      setEncodeError(err?.message ?? String(err));
    } finally {
      setEncoding(false);
    }
  }, [mediaFiles, selectedStreams, hasAnySelection, hash, encoding]);

  React.useEffect(() => {
    if (!hash) return;

    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getValidToken();
        const headers = new Headers();
        if (t) headers.set("Authorization", `Bearer ${t}`);

        // Updated endpoint replacing /api/convert/media-infos
        const res = await fetch(`${API_BASE}/api/files/${hash}`, { headers });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? res.statusText);
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setMediaFiles(data as MediaFileInfo[]);
        } else throw new Error("Unexpected media files response");
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchInfo();
  }, [hash]);

  if (!hash) {
    return <div className="p-6">No hash provided.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Torrent Media Files</h1>
      <div className="mb-4 text-sm text-gray-600">Torrent Hash: {hash}</div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}

      {mediaFiles && (
        <div className="space-y-6">
          {/* Global encode action for all files/streams */}
          <div className="flex items-center justify-end gap-3">
            <div className="text-sm text-gray-600">Selected streams: {Object.values(selectedStreams).reduce((acc, s) => acc + (s?.size ?? 0), 0)}</div>
            <button
              type="button"
              disabled={encoding || !hasAnySelection}
              onClick={() => void handleEncodeAll()}
              className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {encoding ? "Encoding..." : "Encode Selected"}
            </button>
          </div>
          {mediaFiles.length === 0 && (
            <div className="text-sm text-gray-500">No media files found.</div>
          )}
          {mediaFiles.map((mf) => (
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
              {mf.mediaInfo?.streams && mf.mediaInfo.streams.length > 0 && (
                <div className="mt-2 space-y-2">
                  {mf.mediaInfo.streams.map((s: any) => {
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
                                if (current.has(s.index))
                                  current.delete(s.index);
                                else current.add(s.index);
                                return {
                                  ...prev,
                                  [mf.relativePath]: current,
                                };
                              });
                            }}
                          />
                          <div className="flex items-center gap-2 flex-wrap text-xs font-medium">
                            {streamTypeIcon(s.type)}
                            {streamCodecIcon(s.codec)}
                            <span>{s.title}</span>
                            {features.map((f: string) => (
                              <span
                                key={f}
                                className="px-1 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px]"
                              >
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
                            <div>
                              {s.width}x{s.height}
                            </div>
                          )}
                          {typeof s.bitRate === "number" && (
                            <div>{formatBitrate(s.bitRate)}</div>
                          )}
                          {typeof s.channels === "number" && (
                            <div>Ch: {s.channels}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-blue-600 dark:text-blue-400">
                  Raw JSON
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-[10px] overflow-auto max-h-64">
                  {JSON.stringify(mf, null, 2)}
                </pre>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
