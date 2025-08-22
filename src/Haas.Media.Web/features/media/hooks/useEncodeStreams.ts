"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import type { MediaFileInfo } from "@/types/media-file-info";

export function useEncodeStreams(hash?: string, mediaFiles?: MediaFileInfo[] | null, selectedStreams?: Record<string, Set<number>>) {
  const [encoding, setEncoding] = React.useState(false);
  const [encodeError, setEncodeError] = React.useState<string | null>(null);

  const encodeAll = React.useCallback(async () => {
    if (!mediaFiles || !selectedStreams || !hash || encoding) return;
    const hasAnySelection = Object.values(selectedStreams).some((s) => s && s.size > 0);
    if (!hasAnySelection) return;
    setEncoding(true);
    setEncodeError(null);
    try {
      const aggregated: Array<{ inputFilePath: string; streamIndex: number; streamType: number }> = [];
      for (const mf of mediaFiles) {
        const sel = selectedStreams[mf.relativePath];
        if (!sel || sel.size === 0) continue;
        for (const idx of sel.values()) {
          const stream = (mf as any).mediaInfo?.streams?.find((st: any) => st.index === idx);
          if (!stream) continue;
          aggregated.push({ inputFilePath: mf.relativePath, streamIndex: idx, streamType: stream.type });
        }
      }
      if (aggregated.length === 0) return;

      const t = await getValidToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (t) (headers as any).Authorization = `Bearer ${t}`;
      const res = await fetch(`/api/downloader/api/torrent-files/${hash}/encode`, {
        method: "POST",
        headers,
        body: JSON.stringify({ streams: aggregated }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      // Backend returns an empty 200/204 on success (see FileConfiguration.cs),
      // so don't attempt to parse JSON here. Return void to indicate success.
      return;
    } catch (err: any) {
      setEncodeError(err?.message ?? String(err));
      throw err;
    } finally {
      setEncoding(false);
    }
  }, [hash, mediaFiles, selectedStreams, encoding]);

  return { encodeAll, encoding, encodeError } as const;
}
