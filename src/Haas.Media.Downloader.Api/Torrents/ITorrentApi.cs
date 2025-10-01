namespace Haas.Media.Downloader.Api.Torrents;

public interface ITorrentApi
{
    TorrentInfo[] GetUploadedTorrents();
    Task StartFromStreamAsync(Stream torrentFileData);
    Task StartFromFileAsync(string relativePath);
    Task<bool> StartAsync(string hash);
    Task<bool> PauseAsync(string hash);
    Task<bool> StopAsync(string hash);
    Task<bool> DeleteAsync(string hash, bool deleteData);
}
