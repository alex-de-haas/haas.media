namespace Haas.Media.Services.Torrents;

public record TorrentFromFileResult(bool Success, string Message, string? Hash = null);
