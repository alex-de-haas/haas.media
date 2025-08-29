"use client";

import React from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";
import type { EncodingProcessInfo } from "@/types/encoding";
import { useEncodingActions } from "@/features/media/hooks";
import {
  HubConnection,
  HubConnectionBuilder,
  LogLevel,
} from "@microsoft/signalr";
import { PageHeader } from "@/components/layout";

export default function EncodingsPage() {
  const [encodings, setEncodings] = React.useState<EncodingProcessInfo[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const { stopEncoding, loading: actionLoading } = useEncodingActions();

  const handleStopEncoding = React.useCallback(async (hash: string) => {
    try {
      await stopEncoding(hash);
      // The encoding will be removed via SignalR
    } catch (err) {
      console.error("Failed to stop encoding:", err);
    }
  }, [stopEncoding]);

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
        const res = await fetch(`${downloaderApi}/api/encodings`, { headers });
        if (!res.ok) throw new Error(res.statusText);
        const data = await res.json();
        if (!mounted) return;
        setEncodings(data ?? []);

        // setup SignalR connection
        connection = new HubConnectionBuilder()
          .withUrl(`${downloaderApi}/hub/encodings`, {
            accessTokenFactory: () => t ?? "",
          })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connection.on("EncodingUpdated", (info: EncodingProcessInfo) => {
          setEncodings((prev) => {
            const existing = prev ?? [];
            const idx = existing.findIndex(
              (e) =>
                e.id === info.id && e.outputPath === info.outputPath
            );
            if (idx === -1) {
              return [info, ...existing];
            }
            const copy = [...existing];
            copy[idx] = info;
            return copy;
          });
        });

        connection.on("EncodingDeleted", (info: EncodingProcessInfo) => {
          setEncodings((prev) => {
            const existing = prev ?? [];
            return existing.filter(
              (e) =>
                !(e.id === info.id && e.outputPath === info.outputPath)
            );
          });
        });

        connection.on("EncodingCompleted", (info: EncodingProcessInfo) => {
          setEncodings((prev) => {
            const existing = prev ?? [];
            return existing.filter(
              (e) =>
                !(e.id === info.id && e.outputPath === info.outputPath)
            );
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
      <PageHeader
        title="Encodings"
        description="Monitor your encoding tasks."
      />

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
              key={`${e.id}-${e.outputPath}`}
              className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {e.outputPath}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium">
                    {e.progress.toFixed(2)}%
                  </div>
                  <button
                    onClick={() => handleStopEncoding(e.id)}
                    disabled={actionLoading}
                    className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 dark:text-red-400 dark:border-red-600 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? "Stopping..." : "Stop"}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-4">
                <span>Elapsed: {formatDuration(e.elapsedTimeSeconds)}</span>
                <span>
                  ETA: {e.progress > 0 ? formatDuration(e.estimatedTimeSeconds) : "calculating…"}
                </span>
              </div>
              <div className="mt-2 h-3 w-full bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
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

function formatDuration(totalSeconds: number): string {
  if (!isFinite(totalSeconds) || totalSeconds < 0) return "0:00";
  const secs = Math.round(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const mm = minutes.toString().padStart(2, '0');
  const ss = seconds.toString().padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`;
}
