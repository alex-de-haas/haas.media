using System.Collections.Concurrent;
using Haas.Media.Core;
using Instances;

namespace Haas.Media.Downloader.Api.Files;

using Microsoft.AspNetCore.SignalR;

public class FileService : IFileApi, IHostedService
{
    private readonly string _downloadsPath;
    private readonly string _outputPath;
    private readonly HashSet<string> _allowedExtensions = InternalConstants.MediaExtensions;
    private readonly ConcurrentDictionary<IProcessInstance, EncodingInfo> _activeProcesses = new();
    private readonly IHubContext<EncodingHub> _hubContext;

    public FileService(IHubContext<EncodingHub> hubContext)
    {
        _hubContext = hubContext;
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "data", "downloads");
        _outputPath = Path.Combine(Environment.CurrentDirectory, "data", "output");
        Directory.CreateDirectory(_downloadsPath);
        Directory.CreateDirectory(_outputPath);
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        // HostedService start hook - no background work required currently.
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        foreach (var process in _activeProcesses.Keys)
        {
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

        return Task.CompletedTask;
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

    public async Task EncodeAsync(
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
                .WithVideoCodec(StreamCodec.HEVC);

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
                    await _hubContext.Clients.All.SendAsync("EncodingDeleted", info);
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
}
