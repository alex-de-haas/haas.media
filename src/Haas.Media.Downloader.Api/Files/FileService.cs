using System.Collections.Concurrent;
using Haas.Media.Core;
using Instances;

namespace Haas.Media.Downloader.Api.Files;

public class FileService : IFileApi, IHostedService
{
    private readonly string _downloadsPath;
    private readonly string _outputPath;
    private readonly HashSet<string> _allowedExtensions = InternalConstants.MediaExtensions;
    private readonly ConcurrentDictionary<IProcessInstance, TimeSpan> _activeProcesses = new();

    public FileService()
    {
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
        // HostedService stop hook - no cleanup required currently.
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

    public async Task<string> EncodeAsync(string hash, EncodeRequest request, CancellationToken ct = default)
    {
        if (request.Streams == null || request.Streams.Length == 0)
            throw new ArgumentException("At least one stream must be specified", nameof(request));

        var path = Path.Combine(_downloadsPath, hash);

        // Group streams by their input file (relative paths)
        var streamsByFile = request.Streams.GroupBy(s => s.InputFilePath).ToArray();

        // Use first file to derive output naming
        var videoInputPath = request
            .Streams.Where(x => x.StreamType == StreamType.Video)
            .Select(x => x.InputFilePath)
            .FirstOrDefault();
        if (string.IsNullOrEmpty(videoInputPath))
            throw new ArgumentException(
                "At least one video stream must be specified",
                nameof(request)
            );

        var videoInputFullPath = Path.Combine(path, videoInputPath);
        if (!File.Exists(videoInputFullPath))
            throw new FileNotFoundException("Input file not found", videoInputFullPath);

        var inputDir = Path.GetDirectoryName(videoInputFullPath)!;
        var inputNameNoExt = Path.GetFileNameWithoutExtension(videoInputFullPath);

        var outputDir = Path.Combine(_outputPath, hash);
        Directory.CreateDirectory(outputDir);

        var outputFile = Path.Combine(outputDir, $"{inputNameNoExt}.h265.mkv");
        if (File.Exists(outputFile))
        {
            int i = 1;
            while (File.Exists(outputFile))
            {
                outputFile = Path.Combine(outputDir, $"{inputNameNoExt}.h265.{i}.mkv");
                i++;
            }
        }

        // Cache media info per file to avoid redundant probes
        var mediaInfoCache = new Dictionary<string, MediaInfo>(StringComparer.OrdinalIgnoreCase);
        async Task<MediaInfo> GetMediaInfoAsync(string relative)
        {
            if (!mediaInfoCache.TryGetValue(relative, out var mi))
            {
                var full = Path.Combine(path, relative);
                if (!File.Exists(full))
                    throw new FileNotFoundException("Input file not found", full);
                mi = await MediaManager.GetMediaInfoAsync(full);
                mediaInfoCache[relative] = mi;
            }
            return mi;
        }

        var builder = MediaEncodingBuilder.Create();

        // Add all distinct inputs
        foreach (var fileGroup in streamsByFile)
        {
            var full = Path.Combine(path, fileGroup.Key);
            builder.FromFileInput(full);
        }

        builder.ToFileOutput(outputFile);

        // Determine if we have at least one video stream to encode with HEVC
        if (request.Streams.Any(s => s.StreamType == StreamType.Video))
        {
            builder.WithVideoCodec(StreamCodec.HEVC);
        }

        // Collect durations to estimate encoding tracking
        TimeSpan representativeDuration = TimeSpan.Zero;

        foreach (var sreq in request.Streams)
        {
            var mi = await GetMediaInfoAsync(sreq.InputFilePath);
            var match = mi.Streams.FirstOrDefault(ms =>
                ms.Index == sreq.StreamIndex && ms.Type == sreq.StreamType
            );
            if (match == null)
                throw new InvalidOperationException(
                    $"{sreq.StreamType} stream with index {sreq.StreamIndex} not found in file {sreq.InputFilePath}"
                );

            builder.WithStream(match);
            if (match.Type == StreamType.Video && match.Duration > representativeDuration)
                representativeDuration = match.Duration;
        }

        if (representativeDuration == TimeSpan.Zero)
        {
            // Fallback to longest stream if no video selected (ensure cache populated first)
            representativeDuration = mediaInfoCache
                .Values.SelectMany(v => v.Streams)
                .DefaultIfEmpty()
                .Max(s => s?.Duration ?? TimeSpan.Zero);
        }

        var process = builder.Encode();
        _activeProcesses.TryAdd(process, representativeDuration);

        return Path.GetRelativePath(_downloadsPath, outputFile);
    }
}
