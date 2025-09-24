"use client";
import { useState } from "react";
import { TorrentUpload, TorrentList, useTorrents } from "@/features/torrent";
import { useNotifications } from "@/lib/notifications";
import { PageHeader } from "@/components/layout";

export default function TorrentClient() {
  const [isUploading, setIsUploading] = useState(false);
  const { torrents, uploadTorrent, deleteTorrent, startTorrent, stopTorrent, pauseTorrent } =
    useTorrents();
  const { notify } = useNotifications();

  const handleUpload = async (files: File[]) => {
    if (!files.length) {
      return { success: false, message: "No files selected." };
    }
    setIsUploading(true);
    try {
      return await uploadTorrent(files);
    } finally {
      setIsUploading(false);
    }
  };

  const report = (
    result: { success: boolean; message: string },
    labels: { success: string; fail: string },
    typeOverride?: string
  ) => {
    notify({
      title: result.success ? labels.success : labels.fail,
      message: result.message,
      type: (result.success ? typeOverride || "success" : "error") as any,
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

  return (
    <div className="container mx-auto px-4 py-8">
      <PageHeader
        title="Torrents"
        description="Upload new torrent files and monitor their progress."
      />
      <TorrentUpload onUpload={handleUpload} isUploading={isUploading} />
      <TorrentList
        torrents={torrents}
        onDelete={handleDelete}
        onStart={handleStart}
        onStop={handleStop}
        onPause={handlePause}
      />
    </div>
  );
}
