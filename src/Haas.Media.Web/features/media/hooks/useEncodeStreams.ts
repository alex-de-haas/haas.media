"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { MediaFileInfo } from "@/types/media-file-info";
import type { EncodeRequest } from "@/types/encoding";
import { HardwareAcceleration } from "@/types/encoding";

export function useEncodeStreams(
  path?: string,
  mediaFiles?: MediaFileInfo[] | null,
  selectedStreams?: Record<string, Set<number>>,
  hardwareAcceleration?: HardwareAcceleration | null
) {
  const [encoding, setEncoding] = React.useState(false);
  const [encodeError, setEncodeError] = React.useState<string | null>(null);

  const encodeAll = React.useCallback(async () => {
    if (!mediaFiles || !selectedStreams || !path || encoding) return;
    const hasAnySelection = Object.values(selectedStreams).some((s) => s && s.size > 0);
    if (!hasAnySelection) return;
    setEncoding(true);
    setEncodeError(null);
    try {
      const streams: EncodeRequest['streams'] = [];
      for (const mf of mediaFiles) {
        const sel = selectedStreams[mf.relativePath];
        if (!sel || sel.size === 0) continue;
        for (const idx of sel.values()) {
          const stream = (mf as any).mediaInfo?.streams?.find((st: any) => st.index === idx);
          if (!stream) continue;
          streams.push({ 
            inputFilePath: mf.relativePath, 
            streamIndex: idx, 
            streamType: stream.type 
          });
        }
      }
      if (streams.length === 0) return;

      const request: EncodeRequest = {
        streams,
        hardwareAcceleration: hardwareAcceleration ?? undefined,
      };

      const t = await getValidToken();
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (t) (headers as any).Authorization = `Bearer ${t}`;
      const res = await fetch(`${downloaderApi}/api/encodings`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      // Backend returns an empty 200/204 on success (see EncodingConfiguration.cs),
      // so don't attempt to parse JSON here. Return void to indicate success.
      return;
    } catch (err: any) {
      setEncodeError(err?.message ?? String(err));
      throw err;
    } finally {
      setEncoding(false);
    }
  }, [path, mediaFiles, selectedStreams, hardwareAcceleration, encoding]);

  return { encodeAll, encoding, encodeError } as const;
}
