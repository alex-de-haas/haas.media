"use client";

import { useState } from "react";
import {
  TorrentUpload,
  TorrentList,
  useTorrents,
} from "../../features/torrent";
import { useNotifications } from "../../lib/notifications";

export default function TorrentUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const { torrents, uploadTorrent, deleteTorrent, startTorrent, stopTorrent } =
    useTorrents();
  const { notify } = useNotifications();

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const result = await uploadTorrent(file);
      return result;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (hash: string) => {
    const result = await deleteTorrent(hash);

    notify({
      title: result.success ? "Delete Success" : "Delete Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    return result;
  };

  const handleStart = async (hash: string) => {
    const result = await startTorrent(hash);

    notify({
      title: result.success ? "Torrent Started" : "Start Failed",
      message: result.message,
      type: result.success ? "success" : "error",
    });

    return result;
  };

  const handleStop = async (hash: string) => {
    const result = await stopTorrent(hash);

    notify({
      title: result.success ? "Torrent Stopped" : "Stop Failed",
      message: result.message,
      type: result.success ? "info" : "error",
    });

    return result;
  };

  return (
    <div className="mx-auto space-y-8">
      <TorrentUpload onUpload={handleUpload} isUploading={isUploading} />
      <TorrentList
        torrents={torrents}
        onDelete={handleDelete}
        onStart={handleStart}
        onStop={handleStop}
      />
    </div>
  );
}
