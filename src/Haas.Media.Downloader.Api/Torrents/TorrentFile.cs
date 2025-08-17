namespace Haas.Media.Downloader.Api.Torrents;

public record TorrentFile(string Path, long Size, long Downloaded, bool IsMedia);