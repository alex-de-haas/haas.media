"use client";

import { useEffect, useState } from "react";
import { HubConnectionBuilder, HubConnection, HubConnectionState } from "@microsoft/signalr";
import type { TorrentInfo } from "../../../types";
import { getValidToken } from "@/lib/auth/token";
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";

export function useTorrents() {
  const [torrents, setTorrents] = useState<TorrentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [connection, setConnection] = useState<HubConnection | null>(null);

  useEffect(() => {
    let disposed = false;

    async function fetchTorrents() {
      try {
        if (!disposed) {
          setLoading(true);
        }
        const data = await fetchJsonWithAuth<TorrentInfo[]>(`${downloaderApi}/api/torrents`);
        if (!disposed) {
          setTorrents(data);
        }
      } catch (error) {
        console.error("Failed to fetch torrents:", error);
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    }

    fetchTorrents();

    const hubConnection = new HubConnectionBuilder()
      .withUrl(`${downloaderApi}/hub/torrents`, {
        accessTokenFactory: async () => (await getValidToken()) ?? "",
      })
      .withAutomaticReconnect()
      .build();

    const handleTorrentUpdated = (info: TorrentInfo) => {
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
    };

    const handleTorrentDeleted = (hash: string) => {
      setTorrents((prev) => prev.filter((t) => t.hash !== hash));
    };

    hubConnection.on("TorrentUpdated", handleTorrentUpdated);
    hubConnection.on("TorrentDeleted", handleTorrentDeleted);

    // Track the initial connect attempt so cleanup does not abort it when React StrictMode replays effects.
    const startPromise = hubConnection.start();

    void startPromise.catch((error) => {
      if (!disposed) {
        console.error("Failed to start torrents hub connection:", error);
      }
    });

    setConnection(hubConnection);

    return () => {
      disposed = true;
      void startPromise
        .catch(() => undefined)
        .finally(async () => {
          if (hubConnection.state !== HubConnectionState.Disconnected) {
            await hubConnection.stop();
          }
        });
      hubConnection.off("TorrentUpdated", handleTorrentUpdated);
      hubConnection.off("TorrentDeleted", handleTorrentDeleted);
    };
  }, []);

  const uploadTorrent = async (files: File[]): Promise<{ success: boolean; message: string }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/upload`, {
        method: "POST",
        body: formData,
      });

      const contentType = res.headers.get("Content-Type");
      const isJson = contentType?.includes("application/json");
      const payload = isJson ? await res.json() : await res.text();

      if (res.ok) {
        const uploaded = typeof payload?.uploaded === "number" ? payload.uploaded : files.length;
        const failed = typeof payload?.failed === "number" ? payload.failed : 0;
        const errors = Array.isArray(payload?.errors) ? payload.errors : [];

        let message = `Uploaded ${uploaded} torrent${uploaded === 1 ? "" : "s"}.`;
        if (failed > 0) {
          const errorDetails = errors.length ? ` Details: ${errors.join("; ")}` : "";
          message = `Uploaded ${uploaded} torrent${uploaded === 1 ? "" : "s"}, failed ${failed}.${errorDetails}`;
        }

        return { success: failed === 0, message };
      }

      if (typeof payload === "string") {
        return { success: false, message: payload || "Upload failed" };
      }

      const errors = Array.isArray(payload?.errors) ? payload.errors.join("; ") : undefined;
      const fallbackMessage = typeof payload?.message === "string" ? payload.message : "Upload failed";
      return { success: false, message: errors || fallbackMessage };
    } catch {
      return { success: false, message: "Network error occurred" };
    }
  };

  const deleteTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/${hash}`, {
        method: "DELETE",
      });

      if (res.ok) {
        return { success: true, message: "Torrent deleted successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Delete failed" };
      }
    } catch {
      return { success: false, message: "Network error occurred" };
    }
  };

  const startTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/${hash}/start`, {
        method: "POST",
      });

      if (res.ok) {
        return { success: true, message: "Torrent started successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Start failed" };
      }
    } catch {
      return { success: false, message: "Network error occurred" };
    }
  };

  const stopTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/${hash}/stop`, {
        method: "POST",
      });

      if (res.ok) {
        return { success: true, message: "Torrent stopped successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Stop failed" };
      }
    } catch {
      return { success: false, message: "Network error occurred" };
    }
  };

  const pauseTorrent = async (hash: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/${hash}/pause`, {
        method: "POST",
      });

      if (res.ok) {
        return { success: true, message: "Torrent paused successfully!" };
      } else {
        const errorText = await res.text();
        return { success: false, message: errorText || "Pause failed" };
      }
    } catch {
      return { success: false, message: "Network error occurred" };
    }
  };

  return {
    torrents,
    uploadTorrent,
    deleteTorrent,
    startTorrent,
    stopTorrent,
    pauseTorrent,
    connection,
    loading,
  };
}
