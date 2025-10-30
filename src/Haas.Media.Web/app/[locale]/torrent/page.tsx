"use client";

import { useTranslations } from "next-intl";
import { TorrentList, useTorrents } from "@/features/torrent";
import { useNotifications, type NotificationType } from "@/lib/notifications";
import { usePageTitle } from "@/components/layout";
import { TorrentOverview } from "@/components/torrent";

export default function TorrentPage() {
  const t = useTranslations("torrents");
  const { torrents, deleteTorrent, startTorrent, stopTorrent, pauseTorrent, loading } = useTorrents();
  const { notify } = useNotifications();
  const report = (
    result: { success: boolean; message: string },
    labels: { success: string; fail: string },
    successType: NotificationType = "success",
  ) => {
    notify({
      title: result.success ? labels.success : labels.fail,
      message: result.message,
      type: result.success ? successType : "error",
    });
  };

  const handleDelete = async (hash: string) => {
    const res = await deleteTorrent(hash);
    report(res, { success: t("deleteSuccess"), fail: t("deleteFailed") });
    return res;
  };
  const handleStart = async (hash: string) => {
    const res = await startTorrent(hash);
    report(res, { success: t("torrentStarted"), fail: t("startFailed") });
    return res;
  };
  const handleStop = async (hash: string) => {
    const res = await stopTorrent(hash);
    report(res, { success: t("torrentStopped"), fail: t("stopFailed") });
    return res;
  };
  const handlePause = async (hash: string) => {
    const res = await pauseTorrent(hash);
    report(res, { success: t("torrentPaused"), fail: t("pauseFailed") });
    return res;
  };

  usePageTitle(t("title"));

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <TorrentOverview torrents={torrents} loading={loading} />
      <div className="space-y-8">
        <TorrentList
          torrents={torrents}
          loading={loading}
          onDelete={handleDelete}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
        />
      </div>
    </main>
  );
}
