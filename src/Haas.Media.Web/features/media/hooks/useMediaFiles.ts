"use client";

import React from "react";
import type { MediaFileInfo } from "@/types/media-file-info";
import { getValidToken } from "@/lib/auth/token";
import { API_DOWNLOADER_URL } from "@/lib/api";

export function useMediaFiles(hash?: string) {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = React.useState<MediaFileInfo[] | null>(null);

  React.useEffect(() => {
    if (!hash) return;
    const fetchInfo = async () => {
      setLoading(true);
      setError(null);
      try {
        const t = await getValidToken();
        const headers = new Headers();
        if (t) headers.set("Authorization", `Bearer ${t}`);
        const res = await fetch(`${API_DOWNLOADER_URL}/api/files/${hash}`, { headers });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? res.statusText);
        }
        const data = await res.json();
        if (Array.isArray(data)) setMediaFiles(data as MediaFileInfo[]);
        else throw new Error("Unexpected media files response");
      } catch (err: any) {
        setError(err?.message ?? String(err));
      } finally {
        setLoading(false);
      }
    };
    fetchInfo();
  }, [hash]);

  return { mediaFiles, loading, error, setMediaFiles } as const;
}
