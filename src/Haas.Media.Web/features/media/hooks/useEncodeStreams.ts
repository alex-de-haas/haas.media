"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { MediaFileInfo } from "@/types/media-file-info";
import type { EncodeRequest } from "@/types/encoding";
import { HardwareAcceleration } from "@/types/encoding";
import { StreamCodec } from "@/types/media-info";

export function useEncodeStreams(
  path?: string,
  mediaFiles?: MediaFileInfo[] | null,
  selectedStreams?: Record<string, Set<number>>,
  hardwareAcceleration?: HardwareAcceleration | null,
  videoCodec?: StreamCodec | null,
  device?: string | null,
  availableDevices?: string[]
) {
  const [encoding, setEncoding] = React.useState(false);
  const [encodeError, setEncodeError] = React.useState<string | null>(null);

  const encodeAll = React.useCallback(async () => {
    if (!mediaFiles || !selectedStreams || !path || encoding) return;
    const hasAnySelection = Object.values(selectedStreams).some((s) => s && s.size > 0);
    if (!hasAnySelection) return;
    
    // Validate required fields
    if (hardwareAcceleration === undefined || hardwareAcceleration === null) {
      throw new Error("Hardware acceleration must be selected");
    }
    if (videoCodec === undefined || videoCodec === null) {
      throw new Error("Video codec must be selected");
    }
    // Device is only required if hardware acceleration is not None AND devices are available
    if (hardwareAcceleration !== HardwareAcceleration.None && 
        availableDevices && availableDevices.length > 0 && !device) {
      throw new Error("Device must be selected for hardware acceleration");
    }
    
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
        hardwareAcceleration,
        videoCodec,
        streams,
        device: (device || null),
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
  }, [path, mediaFiles, selectedStreams, hardwareAcceleration, videoCodec, device, availableDevices, encoding]);

  return { encodeAll, encoding, encodeError } as const;
}
