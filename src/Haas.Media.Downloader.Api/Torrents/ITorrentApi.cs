namespace Haas.Media.Downloader.Api.Torrents;

public interface ITorrentApi
{
    TorrentInfo[] GetUploadedTorrents();
    Task UploadTorrent(Stream torrentFileData);
    Task<bool> StartAsync(string hash);
    Task<bool> PauseAsync(string hash);
    Task<bool> StopAsync(string hash);
    Task<bool> DeleteAsync(string hash, bool deleteData);
}
