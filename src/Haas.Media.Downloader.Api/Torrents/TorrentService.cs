using Microsoft.AspNetCore.SignalR;
using MonoTorrent;
using MonoTorrent.Client;

namespace Haas.Media.Downloader.Api.Torrents;

public class TorrentService
{
    private readonly ClientEngine _engine;
    private readonly string _downloadsPath;
    private readonly TorrentSettings _torrentSettings;
    private readonly IHubContext<TorrentHub> _hubContext;
    private readonly Timer _broadcastTimer;

    public TorrentService(IHubContext<TorrentHub> hubContext)
    {
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "downloads");

        var settingsBuilder = new TorrentSettingsBuilder { MaximumConnections = 60 };
        _torrentSettings = settingsBuilder.ToSettings();

        _engine = new();
        _hubContext = hubContext;

        _broadcastTimer = new Timer(async _ => await BroadcastTorrentStatesAsync(), null, 0, 1000);
    }

    public async Task AddTorrent(Stream torrentFileData)
    {
        using var memoryStream = new MemoryStream();
        await torrentFileData.CopyToAsync(memoryStream);
        memoryStream.Seek(0, SeekOrigin.Begin);

        var torrent = await Torrent.LoadAsync(memoryStream);

        var manager = await _engine.AddAsync(torrent, _downloadsPath, _torrentSettings);
        await manager.StartAsync();
    }

    public async Task BroadcastTorrentStatesAsync()
    {
        foreach (var manager in _engine.Torrents)
        {
            var info = CreateTorrentInfo(manager);
            await _hubContext.Clients.All.SendAsync("ReceiveTorrentInfo", info);
        }
    }

    public TorrentInfo[] GetUploadedTorrents()
    {
        return _engine.Torrents.Select(CreateTorrentInfo).ToArray();
    }

    private TorrentInfo CreateTorrentInfo(TorrentManager manager)
    {
        return new TorrentInfo(
            manager.InfoHashes.V1OrV2.ToHex(),
            manager.Name,
            manager.Torrent?.Size,
            (long?)(manager.Torrent?.Size * manager.Progress / 100),
            manager.Progress,
            manager.Monitor.DownloadRate,
            manager.Monitor.UploadRate,
            manager.State
        );
    }

    public async Task<bool> StartAsync(string hash)
    {
        if (!TryGetManager(hash, out var manager))
            return false;

        await manager!.StartAsync();
        return true;
    }

    public async Task<bool> StopAsync(string hash)
    {
        if (!TryGetManager(hash, out var manager))
            return false;

        await manager!.StopAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(string hash, bool deleteData)
    {
        if (!TryGetManager(hash, out var manager))
            return false;

        // Capture file paths before removal in case the manager becomes unusable after RemoveAsync
        var filePaths = manager!.Files.Select(f => f.FullPath).ToArray();

        // Ensure torrent is stopped before removing
        await manager.StopAsync();

        // Remove from engine
        await _engine.RemoveAsync(manager);

        if (deleteData)
        {
            foreach (var path in filePaths)
            {
                if (File.Exists(path))
                {
                    File.Delete(path);
                }
                else if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }
                else
                {
                    // Sometimes torrents create a folder at the root named after the torrent
                    // Attempt to delete the folder under downloads if it matches the file's top directory
                    var topDir = GetTopDirectory(path);
                    if (!string.IsNullOrWhiteSpace(topDir))
                    {
                        var candidate = Path.Combine(_downloadsPath, topDir);
                        if (Directory.Exists(candidate))
                            Directory.Delete(candidate, true);
                    }
                }
            }
        }

        return true;
    }

    private static string? GetTopDirectory(string fullPath)
    {
        try
        {
            var relative = fullPath;
            // Normalize separators
            relative = relative
                .Replace('\\', Path.DirectorySeparatorChar)
                .Replace('/', Path.DirectorySeparatorChar);
            var parts = relative.Split(
                Path.DirectorySeparatorChar,
                StringSplitOptions.RemoveEmptyEntries
            );
            return parts.Length > 1 ? parts[0] : null;
        }
        catch
        {
            return null;
        }
    }

    private bool TryGetManager(string hash, out TorrentManager? manager)
    {
        manager = _engine.Torrents.FirstOrDefault(m =>
            string.Equals(m.InfoHashes.V1OrV2.ToHex(), hash, StringComparison.OrdinalIgnoreCase)
        );
        return manager != null;
    }

    public record TorrentInfo(
        string Hash,
        string Name,
        long? Size,
        long? Downloaded,
        double Progress,
        long DownloadRate,
        long UploadRate,
        TorrentState State
    );
}
