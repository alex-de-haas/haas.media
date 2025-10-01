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
import { EncodingOverview, EncodingQueue } from "@/components/encoding";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EncodingsPage() {
  const [encodings, setEncodings] = React.useState<EncodingProcessInfo[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [stoppingId, setStoppingId] = React.useState<string | null>(null);
  const { stopEncoding, error: actionError } = useEncodingActions();

  const handleStopEncoding = React.useCallback(async (hash: string) => {
    setStoppingId(hash);
    try {
      await stopEncoding(hash);
      // The encoding will be removed via SignalR
    } catch (err) {
      console.error("Failed to stop encoding:", err);
    } finally {
      setStoppingId((current) => (current === hash ? null : current));
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
        const headers: Record<string, string> = {};
        if (t) headers.Authorization = `Bearer ${t}`;
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
      } catch (err) {
        if (!mounted) return;
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
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
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <PageHeader
        title="Encodings"
        description="Monitor your encoding tasks."
      />

      <EncodingOverview encodings={encodings} loading={loading} />

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load encodings</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertTitle>Failed to stop encoding</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <EncodingQueue
          encodings={encodings}
          loading={loading}
          stoppingId={stoppingId}
          onStop={handleStopEncoding}
        />
      </div>
    </main>
  );
}
