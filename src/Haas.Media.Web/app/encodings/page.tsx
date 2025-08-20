"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import type { EncodingInfo } from "@/types/encoding";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { API_DOWNLOADER_URL } from "@/lib/api";

export default function EncodingsPage() {
  const [encodings, setEncodings] = React.useState<EncodingInfo[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
  let connection: HubConnection | null = null;
    let mounted = true;

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const t = await getValidToken();

        // initial fetch to populate list
        const headers: HeadersInit = {};
        if (t) (headers as any).Authorization = `Bearer ${t}`;
        const res = await fetch(`${API_DOWNLOADER_URL}/api/encodings`, { headers });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!mounted) return;
        setEncodings(data ?? []);

        // setup SignalR connection
        connection = new HubConnectionBuilder()
          .withUrl(`${API_DOWNLOADER_URL}/hub/encodings`, {
            accessTokenFactory: () => t ?? "",
          })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connection.on("EncodingUpdated", (info: EncodingInfo) => {
          setEncodings((prev) => {
            const existing = prev ?? [];
            const idx = existing.findIndex((e) => e.hash === info.hash && e.outputFileName === info.outputFileName);
            if (idx === -1) {
              return [info, ...existing];
            }
            const copy = [...existing];
            copy[idx] = info;
            return copy;
          });
        });

        connection.on("EncodingDeleted", (info: EncodingInfo) => {
          setEncodings((prev) => {
            const existing = prev ?? [];
            return existing.filter((e) => e.hash !== info.hash && e.outputFileName !== info.outputFileName);
          });
        });

        await connection.start();
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message ?? String(err));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
      if (connection) {
        connection.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <main className="mx-auto space-y-10">
      <h1 className="text-2xl font-semibold mb-4">Encodings</h1>

      {loading && !encodings && <p>Loading…</p>}
      {error && (
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
      )}

      {encodings && encodings.length === 0 && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          No active encodings.
        </div>
      )}

      {encodings && encodings.length > 0 && (
        <div className="space-y-3">
          {encodings.map((e) => (
            <div
              key={e.hash}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {e.outputFileName}
                  </div>
                  <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                    {e.hash}
                  </div>
                </div>
                <div className="text-sm font-medium">
                  {e.progress.toFixed(2)}%
                </div>
              </div>
              <div className="mt-3 h-3 w-full bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
                <div
                  style={{
                    width: `${Math.max(0, Math.min(100, e.progress))}%`,
                  }}
                  className="h-full bg-blue-600 dark:bg-blue-400 transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
