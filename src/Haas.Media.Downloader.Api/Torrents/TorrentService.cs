using Haas.Media.Core.Helpers;
using Microsoft.AspNetCore.SignalR;
using MonoTorrent;
using MonoTorrent.Client;

namespace Haas.Media.Downloader.Api.Torrents;

public class TorrentService : ITorrentApi, IHostedService, IAsyncDisposable
{
    private ClientEngine? _engine;
    private readonly string _dataPath;
    private readonly string _downloadsPath;
    private readonly string _torrentsPath;
    private readonly string _cachePath;
    private readonly TorrentSettings _torrentSettings;
    private readonly IHubContext<TorrentHub> _hubContext;
    private Timer? _broadcastTimer;

    public TorrentService(
        IConfiguration configuration,
        IHubContext<TorrentHub> hubContext,
        ILogger<TorrentService> logger
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _downloadsPath = Path.Combine(_dataPath, "Downloads");
        _torrentsPath = Path.Combine(_dataPath, ".torrents");
        _cachePath = Path.Combine(_dataPath, ".cache");

        logger.LogInformation(
            "TorrentService initialized with downloads path: {DownloadsPath}, torrents path: {TorrentsPath}",
            _downloadsPath,
            _torrentsPath
        );

        var settingsBuilder = new TorrentSettingsBuilder { MaximumConnections = 60 };
        _torrentSettings = settingsBuilder.ToSettings();

        _hubContext = hubContext;
    }

    public async Task UploadTorrent(Stream torrentFileData)
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
        using (
            var fileStream = File.Open(
                torrentFilePath,
                FileMode.Create,
                FileAccess.Write,
                FileShare.None
            )
        )
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
        // Root folder for this torrent (hash-based); files will be reported relative to this root when possible
        var hash = manager.InfoHashes.V1OrV2.ToHex();
        var torrentRoot = Path.Combine(_downloadsPath, hash);

        // Compute ETA in seconds when possible
        double? estimatedTimeSeconds = null;
        try
        {
            var totalSize = manager.Torrent?.Size;
            var downloadRate = manager.Monitor.DownloadRate; // bytes/sec
            var progress = manager.Progress; // 0..100

            if (manager.Complete || progress >= 100)
            {
                estimatedTimeSeconds = 0;
            }
            else if (totalSize.HasValue && downloadRate > 0)
            {
                var downloadedBytes = (long?)(totalSize.Value * progress / 100.0) ?? 0;
                var remaining = Math.Max(0L, totalSize.Value - downloadedBytes);
                estimatedTimeSeconds = remaining / (double)downloadRate;
            }
        }
        catch
        {
            // leave ETA as null if any calculation fails
        }
        return new TorrentInfo(
            hash,
            manager.Name,
            manager.Torrent?.Size,
            (long?)(manager.Torrent?.Size * manager.Progress / 100),
            manager.Progress,
            manager.Monitor.DownloadRate,
            manager.Monitor.UploadRate,
            estimatedTimeSeconds,
            manager.State,
            manager
                .Files.Select(f =>
                {
                    // First, attempt to get path relative to the torrent's root hash folder for cleaner display
                    string displayPath;
                    if (
                        !string.IsNullOrEmpty(f.FullPath)
                        && f.FullPath.StartsWith(torrentRoot, StringComparison.OrdinalIgnoreCase)
                    )
                    {
                        displayPath = Path.GetRelativePath(torrentRoot, f.FullPath);
                    }
                    else
                    {
                        var rel = Path.GetRelativePath(_downloadsPath, f.FullPath);
                        displayPath = rel.StartsWith("..") ? f.FullPath : rel;
                    }
                    var isMedia = FileHelper.IsMediaFile(displayPath);
                    return new TorrentFile(displayPath, f.Length, f.BytesDownloaded(), isMedia);
                })
                .ToArray()
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

    public async Task<bool> PauseAsync(string hash)
    {
        EnsureStarted();
        if (!TryGetManager(hash, out var manager))
            return false;

        await manager!.PauseAsync();
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
                try
                {
                    // If the path is under the downloads folder, operate on that path.
                    var rel = Path.GetRelativePath(_downloadsPath, path);
                    if (!string.IsNullOrWhiteSpace(rel) && !rel.StartsWith(".."))
                    {
                        var candidatePath = Path.Combine(_downloadsPath, rel);
                        if (File.Exists(candidatePath))
                        {
                            File.Delete(candidatePath);
                            continue;
                        }
                        if (Directory.Exists(candidatePath))
                        {
                            Directory.Delete(candidatePath, true);
                            continue;
                        }
                    }

                    // Fall back to the original absolute path
                    if (File.Exists(path))
                    {
                        File.Delete(path);
                        continue;
                    }
                    if (Directory.Exists(path))
                    {
                        Directory.Delete(path, true);
                        continue;
                    }

                    // Sometimes torrents create a folder at the root named after the torrent
                    var topDir = GetTopDirectory(path);
                    if (!string.IsNullOrWhiteSpace(topDir))
                    {
                        var candidate = Path.Combine(_downloadsPath, topDir);
                        if (Directory.Exists(candidate))
                        {
                            Directory.Delete(candidate, true);
                            continue;
                        }
                    }
                }
                catch
                {
                    // ignore individual delete failures
                }
            }
        }

        // Notify clients about the deleted torrent
        await _hubContext.Clients.All.SendAsync("TorrentDeleted", hash);

        return true;
    }

    private string? GetTopDirectory(string fullPath)
    {
        try
        {
            // Compute path relative to downloads folder. If the file is not under downloads, return null.
            var rel = Path.GetRelativePath(_downloadsPath, fullPath);
            if (string.IsNullOrWhiteSpace(rel) || rel.StartsWith(".."))
                return null;

            // Normalize separators and take the first segment
            rel = rel.Replace('\\', Path.DirectorySeparatorChar)
                .Replace('/', Path.DirectorySeparatorChar);
            var parts = rel.Split(
                Path.DirectorySeparatorChar,
                StringSplitOptions.RemoveEmptyEntries
            );
            return parts.Length > 0 ? parts[0] : null;
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
        var engineSettings = new EngineSettingsBuilder { CacheDirectory = _cachePath }.ToSettings();
        _engine ??= new ClientEngine(engineSettings);
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
        var torrentFiles = Directory.Exists(_torrentsPath)
            ? Directory.GetFiles(_torrentsPath, "*.torrent", SearchOption.TopDirectoryOnly)
            : Array.Empty<string>();

        foreach (var file in torrentFiles)
        {
            var torrent = await Torrent.LoadAsync(file);
            var hash = torrent.InfoHashes.V1OrV2.ToHex();
            var manager = await _engine.AddAsync(torrent, _downloadsPath, _torrentSettings);
            if (!manager.Complete)
            {
                await manager.StartAsync();
            }
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
