using System.Collections.Concurrent;
using Haas.Media.Core;
using Instances;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Encodings;

public class EncodingService : IEncodingApi, IHostedService, IDisposable
{
    private readonly string _downloadsPath;
    private readonly string _outputPath;
    private readonly HashSet<string> _allowedExtensions = InternalConstants.MediaExtensions;
    private readonly ConcurrentDictionary<IProcessInstance, EncodingInfo> _activeProcesses = new();
    private readonly IHubContext<EncodingHub> _hubContext;
    private readonly IHostApplicationLifetime _applicationLifetime;
    private bool _disposed = false;

    public EncodingService(
        IHubContext<EncodingHub> hubContext,
        IHostApplicationLifetime applicationLifetime
    )
    {
        _hubContext = hubContext;
        _applicationLifetime = applicationLifetime;
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "data", "downloads");
        _outputPath = Path.Combine(Environment.CurrentDirectory, "data", "output");
        Directory.CreateDirectory(_downloadsPath);
        Directory.CreateDirectory(_outputPath);
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // Register for application shutdown events as an additional safety measure
        _applicationLifetime.ApplicationStopping.Register(() =>
        {
            CleanupActiveProcesses();
        });

        // HostedService start hook - no background work required currently.
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        CleanupActiveProcesses();
        return Task.CompletedTask;
    }

    public void Dispose()
    {
        if (!_disposed)
        {
            CleanupActiveProcesses();
            _disposed = true;
        }
    }

    private void CleanupActiveProcesses()
    {
        // Capture current entries to avoid collection-modified issues and to allow cleanup of output files
        var entries = _activeProcesses.ToArray();

        foreach (var kvp in entries)
        {
            var process = kvp.Key;
            try
            {
                process.Kill();
            }
            catch (Exception ex)
            {
                // Log or handle the exception as needed
                Console.WriteLine($"Error killing process: {ex.Message}");
            }
        }

        // Remove output files for any encodings that were active
        foreach (var kvp in entries)
        {
            try
            {
                var info = kvp.Value;
                var outputFullPath = Path.Combine(_outputPath, info.Hash, info.OutputFileName);
                if (File.Exists(outputFullPath))
                    File.Delete(outputFullPath);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting output file during cleanup: {ex.Message}");
            }
        }

        _activeProcesses.Clear();
    }

    public async Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash)
    {
        var path = Path.Combine(_downloadsPath, hash);
        if (!Directory.Exists(path))
            return [];

        var files = Directory
            .EnumerateFiles(path, "*.*", SearchOption.AllDirectories)
            .Where(f => _allowedExtensions.Contains(Path.GetExtension(f)))
            .Select(f =>
            {
                var fileInfo = new FileInfo(f);
                var relativePath = Path.GetRelativePath(path, f);
                return new MediaFileInfo
                {
                    Name = fileInfo.Name,
                    RelativePath = relativePath,
                    Size = fileInfo.Length,
                    LastModified = fileInfo.LastWriteTimeUtc,
                    Extension = fileInfo.Extension,
                };
            })
            .OrderByDescending(m => m.LastModified)
            .ToArray();

        foreach (var file in files)
        {
            file.MediaInfo = await MediaManager.GetMediaInfoAsync(
                Path.Combine(path, file.RelativePath)
            );
        }

        return files;
    }

    public async Task StartEncodingAsync(
        string hash,
        EncodeRequest request,
        CancellationToken ct = default
    )
    {
        if (request.Streams == null || request.Streams.Length == 0)
            throw new ArgumentException("At least one stream must be specified", nameof(request));

        var path = Path.Combine(_downloadsPath, hash);

        var videoFiles = request
            .Streams.Where(x => x.StreamType == StreamType.Video)
            .Select(x => x.InputFilePath)
            .ToArray();
        if (videoFiles.Length == 0)
            throw new ArgumentException(
                "At least one video file must be specified",
                nameof(request)
            );

        var outputFolder = Path.Combine(_outputPath, hash);
        Directory.CreateDirectory(outputFolder);

        foreach (var videoFile in videoFiles)
        {
            var inputFullPath = Path.Combine(path, videoFile);
            var streamIndexes = request
                .Streams.Where(x => x.InputFilePath == videoFile)
                .Select(x => x.StreamIndex)
                .ToArray();
            var mediaInfo = await MediaManager.GetMediaInfoAsync(inputFullPath);
            var outputFileName = Path.GetFileNameWithoutExtension(videoFile) + ".mkv";
            var outputFullPath = Path.Combine(outputFolder, outputFileName);
            File.Delete(outputFullPath);

            var builder = MediaEncodingBuilder
                .Create()
                .FromFileInput(inputFullPath)
                .ToFileOutput(outputFullPath)
                .WithVideoCodec(StreamCodec.HEVC)
                .WithAutoHardwareAcceleration();

            var streams = mediaInfo.Streams.Where(s => streamIndexes.Contains(s.Index)).ToArray();
            foreach (var stream in streams)
            {
                builder.WithStream(stream);
            }

            var videoStream = streams.First(s => s.Type == StreamType.Video);
            var process = builder.Encode();

            process.ErrorDataReceived += async (sender, data) =>
            {
                var currentTime = MediaHelper.ParseProgressTime(data);
                if (currentTime.HasValue)
                {
                    var progress =
                        currentTime.Value.TotalSeconds / videoStream.Duration.TotalSeconds * 100;
                    if (_activeProcesses.TryGetValue(process, out var info))
                    {
                        info.Progress = progress;
                        await _hubContext.Clients.All.SendAsync("EncodingUpdated", info);
                    }
                }
            };
            process.Exited += async (sender, args) =>
            {
                if (_activeProcesses.TryRemove(process, out var info))
                {
                    await _hubContext.Clients.All.SendAsync("EncodingCompleted", info);
                }
            };

            var info = new EncodingInfo
            {
                Hash = hash,
                OutputFileName = outputFileName,
                Progress = 0,
            };
            _activeProcesses.TryAdd(process, info);
            // Broadcast initial state so clients see the encoding as soon as it starts
            _ = _hubContext.Clients.All.SendAsync("EncodingUpdated", info);
        }
    }

    public EncodingInfo[] GetEncodingsAsync()
    {
        return _activeProcesses.Values.ToArray();
    }

    public async Task StopEncodingAsync(string hash)
    {
        var processToStop = _activeProcesses
            .Where(kvp => kvp.Value.Hash == hash)
            .Select(kvp => kvp.Key)
            .FirstOrDefault();

        if (processToStop != null)
        {
            processToStop.Kill();
            if (_activeProcesses.TryRemove(processToStop, out var info))
            {
                var outputFullPath = Path.Combine(_outputPath, info.Hash, info.OutputFileName);
                if (File.Exists(outputFullPath))
                    File.Delete(outputFullPath);

                await _hubContext.Clients.All.SendAsync("EncodingDeleted", info);
            }
        }
    }
}
