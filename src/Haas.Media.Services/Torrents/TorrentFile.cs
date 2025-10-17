namespace Haas.Media.Services.Torrents;

public record TorrentFile(string Path, long Size, long Downloaded, bool IsMedia);