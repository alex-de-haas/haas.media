"use client";

import { TorrentList, useTorrents } from "@/features/torrent";
import { useNotifications } from "@/lib/notifications";
import { usePageTitle } from "@/components/layout";

export default function TorrentPage() {
  const {
    torrents,
    deleteTorrent,
    startTorrent,
    stopTorrent,
    pauseTorrent,
  } = useTorrents();
  const { notify } = useNotifications();
  const report = (
    result: { success: boolean; message: string },
    labels: { success: string; fail: string },
    typeOverride?: string
  ) => {
    notify({
      title: result.success ? labels.success : labels.fail,
      message: result.message,
      type: (result.success ? typeOverride || "success" : "error") as "success" | "error" | "info" | "warning",
    });
  };

  const handleDelete = async (hash: string) => {
    const res = await deleteTorrent(hash);
    report(res, { success: "Delete Success", fail: "Delete Failed" });
    return res;
  };
  const handleStart = async (hash: string) => {
    const res = await startTorrent(hash);
    report(res, { success: "Torrent Started", fail: "Start Failed" });
    return res;
  };
  const handleStop = async (hash: string) => {
    const res = await stopTorrent(hash);
    report(res, { success: "Torrent Stopped", fail: "Stop Failed" }, "info");
    return res;
  };
  const handlePause = async (hash: string) => {
    const res = await pauseTorrent(hash);
    report(res, { success: "Torrent Paused", fail: "Pause Failed" }, "info");
    return res;
  };

  usePageTitle("Torrents");

  return (
    <main className="space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <div className="space-y-8">
        <TorrentList
          torrents={torrents}
          onDelete={handleDelete}
          onStart={handleStart}
          onStop={handleStop}
          onPause={handlePause}
        />
      </div>
    </main>
  );
}
