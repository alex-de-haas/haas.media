"use client";
import { useState } from "react";
import { TorrentUpload, TorrentList, useTorrents } from "@/features/torrent";
import { useNotifications } from "@/lib/notifications";

export default function TorrentClient() {
  const [isUploading, setIsUploading] = useState(false);
  const { torrents, uploadTorrent, deleteTorrent, startTorrent, stopTorrent } = useTorrents();
  const { notify } = useNotifications();

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try { return await uploadTorrent(file); }
    finally { setIsUploading(false); }
  };

  const report = (result: { success: boolean; message: string }, labels: { success: string; fail: string }, typeOverride?: string) => {
    notify({
      title: result.success ? labels.success : labels.fail,
      message: result.message,
      type: (result.success ? (typeOverride || "success") : "error") as any,
    });
  };

  const handleDelete = async (hash: string) => {
    const res = await deleteTorrent(hash); report(res, { success: "Delete Success", fail: "Delete Failed" }); return res; };
  const handleStart = async (hash: string) => { const res = await startTorrent(hash); report(res, { success: "Torrent Started", fail: "Start Failed" }); return res; };
  const handleStop = async (hash: string) => { const res = await stopTorrent(hash); report(res, { success: "Torrent Stopped", fail: "Stop Failed" }, "info"); return res; };

  return (
    <div className="mx-auto space-y-10">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Torrents</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Upload new torrent files and monitor their progress.</p>
      </div>
      <TorrentUpload onUpload={handleUpload} isUploading={isUploading} />
      <TorrentList torrents={torrents} onDelete={handleDelete} onStart={handleStart} onStop={handleStop} />
    </div>
  );
}
