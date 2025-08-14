/**
 * Torrent-related type definitions
 */

export interface TorrentFile {
  path: string;
  size: number;
  downloaded: number;
}

export interface TorrentInfo {
  hash: string;
  name: string;
  size: number;
  downloaded: number;
  progress: number;
  downloadRate: number;
  uploadRate: number;
  state: TorrentState;
  files: TorrentFile[];
}

export interface TorrentUploadResponse {
  success: boolean;
  message: string;
  hash?: string;
}

export interface TorrentActionResponse {
  success: boolean;
  message: string;
}

export enum TorrentState {
  Stopped,
  Paused,
  Starting,
  Downloading,
  Seeding,
  Hashing,
  HashingPaused,
  Stopping,
  Error,
  Metadata,
  FetchingHashes,
}
