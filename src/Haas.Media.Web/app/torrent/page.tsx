import type { Metadata } from "next";
import TorrentClient from "./torrent-client";

export const metadata: Metadata = {
  title: "Torrents | Haas Media Server",
  description: "Upload and manage torrent downloads",
};

export default function TorrentPage() {
  return <TorrentClient />;
}

