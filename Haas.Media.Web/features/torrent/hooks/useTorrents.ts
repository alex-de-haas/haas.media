"use client";

import { useEffect, useState } from "react";
import { HubConnectionBuilder, HubConnection } from "@microsoft/signalr";
import type { TorrentInfo } from "../../../types";

const API_BASE = "http://localhost:5255";

export function useTorrents() {
  const [torrents, setTorrents] = useState<TorrentInfo[]>([]);
  const [connection, setConnection] = useState<HubConnection | null>(null);

  useEffect(() => {
    async function fetchTorrents() {
      try {
        const res = await fetch(`${API_BASE}/api/torrents`);
        if (res.ok) {
          const data = await res.json();
          setTorrents(data);
        }
      } catch (error) {
        console.error('Failed to fetch torrents:', error);
      }
    }

    fetchTorrents();

    const hubConnection = new HubConnectionBuilder()
      .withUrl(`${API_BASE}/hub/torrents`)
      .withAutomaticReconnect()
      .build();

    hubConnection.on("ReceiveTorrentInfo", (info: TorrentInfo) => {
      setTorrents((prev) => {
        const idx = prev.findIndex((t) => t.hash === info.hash);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = info;
          return updated;
        } else {
          return [...prev, info];
        }
      });
    });

    hubConnection.start().catch(console.error);
    setConnection(hubConnection);

    return () => {
      hubConnection.stop();
    };
  }, []);

  const uploadTorrent = async (file: File): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/torrents/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        return { success: true, message: "Torrent uploaded successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Upload failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const deleteTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/torrents/${hash}`, {
        method: "DELETE",
      });

      if (res.ok) {
        return { success: true, message: "Torrent deleted successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Delete failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const startTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/torrents/${hash}/start`, {
        method: "POST",
      });

      if (res.ok) {
        return { success: true, message: "Torrent started successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Start failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  const stopTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/torrents/${hash}/stop`, {
        method: "POST",
      });

      if (res.ok) {
        return { success: true, message: "Torrent stopped successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Stop failed" };
      }
    } catch (error) {
      return { success: false, message: "Network error occurred" };
    }
  };

  return {
    torrents,
    uploadTorrent,
    deleteTorrent,
    startTorrent,
    stopTorrent,
    connection,
  };
}
