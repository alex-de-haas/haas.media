using Microsoft.AspNetCore.SignalR;
using MonoTorrent;
using MonoTorrent.Client;

namespace Haas.Media.Downloader.Api.Torrents;

public class TorrentService : ITorrentApi, IHostedService, IAsyncDisposable
{
    private ClientEngine? _engine;
    private readonly string _downloadsPath;
    private readonly string _torrentsPath;
    private readonly TorrentSettings _torrentSettings;
    private readonly IHubContext<TorrentHub> _hubContext;
    private Timer? _broadcastTimer;

    public TorrentService(IHubContext<TorrentHub> hubContext)
    {
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "data", "downloads");
        _torrentsPath = Path.Combine(Environment.CurrentDirectory, "data", "torrents");

        // Ensure folders exist
        Directory.CreateDirectory(_downloadsPath);
        Directory.CreateDirectory(_torrentsPath);

        var settingsBuilder = new TorrentSettingsBuilder { MaximumConnections = 60 };
        _torrentSettings = settingsBuilder.ToSettings();

        _hubContext = hubContext;
    }

    public async Task AddTorrent(Stream torrentFileData)
    {
        EnsureStarted();
        using var memoryStream = new MemoryStream();
        await torrentFileData.CopyToAsync(memoryStream);
        memoryStream.Seek(0, SeekOrigin.Begin);

        var torrent = await Torrent.LoadAsync(memoryStream);

        // Persist the original .torrent file using the info hash for uniqueness
        var hashHex = torrent.InfoHashes.V1OrV2.ToHex();
        var torrentFilePath = Path.Combine(_torrentsPath, $"{hashHex}.torrent");
        memoryStream.Seek(0, SeekOrigin.Begin);
        using (var fileStream = File.Open(torrentFilePath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await memoryStream.CopyToAsync(fileStream);
        }

        var manager = await _engine!.AddAsync(torrent, _downloadsPath, _torrentSettings);
        await manager.StartAsync();
    }

    public async Task BroadcastTorrentStatesAsync()
    {
        if (_engine is null)
            return;

        foreach (var manager in _engine.Torrents)
        {
            var info = CreateTorrentInfo(manager);
            await _hubContext.Clients.All.SendAsync("TorrentUpdated", info);
        }
    }

    public TorrentInfo[] GetUploadedTorrents()
    {
        EnsureStarted();
        return _engine!.Torrents.Select(CreateTorrentInfo).ToArray();
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
            manager.State,
            manager.Files.Select(f => new TorrentFile(
                f.FullPath,
                f.Length,
                f.BytesDownloaded()
            )).ToArray()
        );
    }

    public async Task<bool> StartAsync(string hash)
    {
        EnsureStarted();
        if (!TryGetManager(hash, out var manager))
            return false;

        await manager!.StartAsync();
        return true;
    }

    public async Task<bool> StopAsync(string hash)
    {
        EnsureStarted();
        if (!TryGetManager(hash, out var manager))
            return false;

        await manager!.StopAsync();
        return true;
    }

    public async Task<bool> DeleteAsync(string hash, bool deleteData)
    {
        EnsureStarted();
        if (!TryGetManager(hash, out var manager))
            return false;

        // Capture file paths before removal in case the manager becomes unusable after RemoveAsync
        var filePaths = manager!.Files.Select(f => f.FullPath).ToArray();

        // Ensure torrent is stopped before removing
        if (manager!.State != TorrentState.Stopped)
            await manager.StopAsync();

        // Remove from engine
        await _engine!.RemoveAsync(manager);

        // Remove .torrent file
        File.Delete(Path.Combine(_torrentsPath, $"{hash}.torrent"));

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

        // Notify clients about the deleted torrent
        await _hubContext.Clients.All.SendAsync("TorrentDeleted", hash);

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
        manager = _engine!.Torrents.FirstOrDefault(m =>
            string.Equals(m.InfoHashes.V1OrV2.ToHex(), hash, StringComparison.OrdinalIgnoreCase)
        );
        return manager != null;
    }

    // TorrentInfo record moved to separate file for reuse

    // IHostedService implementation
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        // Initialize engine and start broadcast timer
        _engine ??= new ClientEngine();
        _broadcastTimer ??= new Timer(
            async _ =>
            {
                try
                {
                    await BroadcastTorrentStatesAsync();
                }
                catch
                {
                    // swallow to avoid crashing the timer thread
                }
            },
            null,
            TimeSpan.Zero,
            TimeSpan.FromSeconds(1)
        );

        // Ensure folders exist
        Directory.CreateDirectory(_downloadsPath);
        Directory.CreateDirectory(_torrentsPath);

        // Load and start any pre-existing torrents from the torrents folder
        try
        {
            var torrentFiles = Directory.Exists(_torrentsPath)
                ? Directory.GetFiles(_torrentsPath, "*.torrent", SearchOption.TopDirectoryOnly)
                : Array.Empty<string>();

            foreach (var file in torrentFiles)
            {
                try
                {
                    var torrent = await Torrent.LoadAsync(file);
                    var manager = await _engine.AddAsync(torrent, _downloadsPath, _torrentSettings);
                    await manager.StartAsync();
                }
                catch
                {
                    // Ignore individual torrent load/start failures to avoid crashing startup
                }
            }
        }
        catch
        {
            // Ignore folder enumeration issues
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        // Stop timer first
        _broadcastTimer?.Change(Timeout.Infinite, Timeout.Infinite);
        _broadcastTimer?.Dispose();
        _broadcastTimer = null;

        if (_engine is null)
            return;

        // Gracefully stop all torrents
        foreach (var manager in _engine.Torrents.ToArray())
        {
            try
            {
                await manager.StopAsync();
            }
            catch
            {
                // ignore individual manager stop failures
            }
        }
    }

    private void EnsureStarted()
    {
        if (_engine is null)
            throw new InvalidOperationException("TorrentService has not been started yet.");
    }

    public async ValueTask DisposeAsync()
    {
        try
        {
            await StopAsync(CancellationToken.None);
        }
        catch
        { /* ignore */
        }

        if (_engine is not null)
        {
            try
            {
                _engine.Dispose();
            }
            catch
            { /* ignore */
            }
            finally
            {
                _engine = null;
            }
        }
    }
}
