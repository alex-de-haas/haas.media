"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import type { EncodingInfo, HardwareAccelerationInfo } from "@/types/encoding";
import { isMediaEncodingInfo } from "@/types/encoding";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";

export function useMediaFiles(path?: string) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = React.useState<MediaFileInfo[] | null>(null);
  const [hardwareAccelerations, setHardwareAccelerations] = React.useState<HardwareAccelerationInfo[] | null>(null);

  React.useEffect(() => {
    if (!path) return;
    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getValidToken();
        const headers = new Headers();
        if (t) headers.set("Authorization", `Bearer ${t}`);
        const url = new URL(`${downloaderApi}/api/encodings/info`);
        url.searchParams.set("path", path);
        const res = await fetch(url.toString(), { headers });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? res.statusText);
        }
        const data = await res.json();
        if (isMediaEncodingInfo(data)) {
          setMediaFiles(data.mediaFiles);
          setHardwareAccelerations(data.hardwareAccelerations);
        } else {
          throw new Error("Unexpected media encoding info response");
        }
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [path]);

  return { mediaFiles, hardwareAccelerations, loading, error, setMediaFiles } as const;
}
