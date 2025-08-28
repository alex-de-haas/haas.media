using MonoTorrent.Client;

namespace Haas.Media.Downloader.Api.Torrents;

public record TorrentInfo(
    string Hash,
    string Name,
    long? Size,
    long? Downloaded,
    double Progress,
    long DownloadRate,
    long UploadRate,
    double? EstimatedTimeSeconds,
    TorrentState State,
    TorrentFile[] Files
);
