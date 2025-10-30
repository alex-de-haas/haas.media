"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { getValidToken } from "@/lib/auth/token";
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
import type { BackgroundTaskInfo } from "@/types";
import { BackgroundTaskStatus } from "@/types";
import type { EncodingProcessInfo } from "@/types/encoding";
import { isEncodingInfo, isEncodingInfoArray } from "@/types/encoding";
import { useEncodingActions } from "@/features/media/hooks";
import { HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import { usePageTitle } from "@/components/layout";
import { EncodingOverview, EncodingQueue } from "@/components/encoding";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function EncodingsPage() {
  const t = useTranslations("encodings");
  const [encodings, setEncodings] = React.useState<EncodingProcessInfo[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [stoppingId, setStoppingId] = React.useState<string | null>(null);
  const { stopEncoding, error: actionError } = useEncodingActions();

  const handleStopEncoding = React.useCallback(
    async (hash: string) => {
      setStoppingId(hash);
      try {
        await stopEncoding(hash);
        // The encoding will be removed via SignalR
      } catch (err) {
        console.error("Failed to stop encoding:", err);
      } finally {
        setStoppingId((current) => (current === hash ? null : current));
      }
    },
    [stopEncoding],
  );

  React.useEffect(() => {
    let connection: HubConnection | null = null;
    let mounted = true;

    const removeEncodingByTask = (task: BackgroundTaskInfo) => {
      setEncodings((prev) => {
        if (!prev) {
          return prev;
        }

        const next = prev.filter((encoding) => encoding.id !== task.id);
        return next;
      });
    };

    const upsertEncodingFromTask = (task: BackgroundTaskInfo) => {
      if (task.type !== "EncodingTask") {
        return;
      }

      if (task.status !== BackgroundTaskStatus.Pending && task.status !== BackgroundTaskStatus.Running) {
        removeEncodingByTask(task);
        return;
      }

      const payload = task.payload;
      if (!payload || !isEncodingInfo(payload)) {
        return;
      }

      const info = payload as EncodingProcessInfo;

      setEncodings((prev) => {
        const existing = prev ?? [];
        const idx = existing.findIndex((encoding) => encoding.id === info.id && encoding.outputPath === info.outputPath);
        if (idx === -1) {
          return [info, ...existing];
        }
        const copy = [...existing];
        copy[idx] = info;
        return copy;
      });
    };

    async function init() {
      setLoading(true);
      setError(null);
      try {
        const token = await getValidToken();

        const data = await fetchJsonWithAuth<EncodingProcessInfo[]>(`${downloaderApi}/api/encodings`);
        if (!mounted) return;
        const initialEncodings = isEncodingInfoArray(data) ? data : [];
        setEncodings(initialEncodings);

        connection = new HubConnectionBuilder()
          .withUrl(`${downloaderApi}/hub/background-tasks?type=EncodingTask`, {
            accessTokenFactory: () => token ?? "",
          })
          .configureLogging(LogLevel.Information)
          .withAutomaticReconnect()
          .build();

        connection.on("TaskUpdated", upsertEncodingFromTask);

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
        connection.off("TaskUpdated", upsertEncodingFromTask);
        connection.stop().catch(() => {});
      }
    };
  }, []);

  usePageTitle(t("title"));

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <EncodingOverview encodings={encodings} loading={loading} />

      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTitle>{t("unableToLoad")}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertTitle>{t("failedToStop")}</AlertTitle>
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <EncodingQueue encodings={encodings} loading={loading} stoppingId={stoppingId} onStop={handleStopEncoding} />
      </div>
    </main>
  );
}
