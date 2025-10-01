namespace Haas.Media.Downloader.Api.Torrents;

public record TorrentFromFileResult(bool Success, string Message, string? Hash = null);
