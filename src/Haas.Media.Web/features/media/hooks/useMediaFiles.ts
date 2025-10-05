"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import type { EncodingInfo, HardwareAccelerationInfo } from "@/types/encoding";
import { isMediaEncodingInfo } from "@/types/encoding";
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
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
        const url = new URL(`${downloaderApi}/api/encodings/info`);
        url.searchParams.set("path", path);
        const data = await fetchJsonWithAuth<EncodingInfo>(url.toString());
        if (isMediaEncodingInfo(data)) {
          setMediaFiles(data.mediaFiles);
          setHardwareAccelerations(data.hardwareAccelerations);
        } else {
          throw new Error("Unexpected media encoding info response");
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [path]);

  return { mediaFiles, hardwareAccelerations, loading, error, setMediaFiles } as const;
}
