namespace Haas.Media.Downloader.Api.Torrents;

public record StartTorrentFromFileRequest
{
    public string Path { get; init; } = string.Empty;
    public bool OverwriteExisting { get; init; }
}
