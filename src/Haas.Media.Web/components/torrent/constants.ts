import { TorrentState } from "@/types";

export const ACTIVE_TORRENT_STATES = new Set<TorrentState>([
  TorrentState.Downloading,
  TorrentState.Seeding,
  TorrentState.Starting,
  TorrentState.Hashing,
  TorrentState.HashingPaused,
  TorrentState.Metadata,
  TorrentState.FetchingHashes,
]);
