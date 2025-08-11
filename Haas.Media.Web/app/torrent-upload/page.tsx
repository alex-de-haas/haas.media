"use client";

import { useState } from "react";
import { TorrentUpload, TorrentList, useTorrents } from "../../features/torrent";
import { useBrowserNotifications } from "../../lib/hooks/useBrowserNotifications";

export default function TorrentUploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const { torrents, uploadTorrent, deleteTorrent, startTorrent, stopTorrent } = useTorrents();
  const { notify } = useBrowserNotifications();

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

    if (result.success) {
      notify("Delete Success", { body: result.message });
    } else {
      notify("Delete Failed", { body: result.message });
    }

    return result;
  };

  const handleStart = async (hash: string) => {
    const result = await startTorrent(hash);

    if (result.success) {
      notify("Torrent Started", { body: result.message });
    } else {
      notify("Start Failed", { body: result.message });
    }

    return result;
  };

  const handleStop = async (hash: string) => {
    const result = await stopTorrent(hash);

    if (result.success) {
      notify("Torrent Stopped", { body: result.message });
    } else {
      notify("Stop Failed", { body: result.message });
    }

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
