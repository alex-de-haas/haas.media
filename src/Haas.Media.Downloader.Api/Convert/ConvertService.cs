using System.Collections.Concurrent;
using Haas.Media.Core;
using Instances;

namespace Haas.Media.Downloader.Api.Convert;

public class ConvertService : IConvertApi, IHostedService
{
    private readonly string _downloadsPath;
    private readonly HashSet<string> _allowedExtensions = InternalConstants.MediaExtensions;
    private readonly ConcurrentDictionary<IProcessInstance, TimeSpan> _activeProcesses = new();

    public ConvertService()
    {
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "data", "downloads");
        Directory.CreateDirectory(_downloadsPath);
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
            return Array.Empty<MediaFileInfo>();

        var files = Directory
            .EnumerateFiles(path, "*.*", SearchOption.AllDirectories)
            .Where(f => _allowedExtensions.Contains(Path.GetExtension(f)))
            .Select(f =>
            {
                var fi = new FileInfo(f);
                var relative = Path.GetRelativePath(_downloadsPath, f);
                return new MediaFileInfo
                {
                    Name = fi.Name,
                    RelativePath = relative,
                    Size = fi.Length,
                    LastModified = fi.LastWriteTimeUtc,
                    Extension = fi.Extension,
                };
            })
            .OrderByDescending(m => m.LastModified)
            .ToArray();

        foreach (var file in files)
        {
            file.MediaInfo = await MediaManager.GetMediaInfoAsync(
                Path.Combine(_downloadsPath, file.RelativePath)
            );
        }

        return files;
    }

    public async Task<string> EncodeAsync(EncodeRequest request, CancellationToken ct = default)
    {
        if (request.Streams == null || request.Streams.Length == 0)
            throw new ArgumentException("At least one stream must be specified", nameof(request));

        // Group streams by their input file (relative paths)
        var streamsByFile = request.Streams.GroupBy(s => s.InputFilePath).ToArray();

        // Use first file to derive output naming
        var primaryInputRelative = request.Streams.Where(x => x.StreamType == StreamType.Video)
            .Select(x => x.InputFilePath)
            .FirstOrDefault();
        if (string.IsNullOrEmpty(primaryInputRelative))
            throw new ArgumentException("At least one video stream must be specified", nameof(request));

        var primaryInputFullPath = Path.Combine(_downloadsPath, primaryInputRelative);
        if (!File.Exists(primaryInputFullPath))
            throw new FileNotFoundException("Input file not found", primaryInputFullPath);

        var inputDir = Path.GetDirectoryName(primaryInputFullPath)!;
        var inputNameNoExt = Path.GetFileNameWithoutExtension(primaryInputFullPath);
        var outputFile = Path.Combine(inputDir, $"{inputNameNoExt}.h265.mkv");
        if (File.Exists(outputFile))
        {
            int i = 1;
            while (File.Exists(outputFile))
            {
                outputFile = Path.Combine(inputDir, $"{inputNameNoExt}.h265.{i}.mkv");
                i++;
            }
        }

        // Cache media info per file to avoid redundant probes
        var mediaInfoCache = new Dictionary<string, MediaInfo>(StringComparer.OrdinalIgnoreCase);
        async Task<MediaInfo> GetMediaInfoAsync(string relative)
        {
            if (!mediaInfoCache.TryGetValue(relative, out var mi))
            {
                var full = Path.Combine(_downloadsPath, relative);
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
            var full = Path.Combine(_downloadsPath, fileGroup.Key);
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
            var match = mi.Streams.FirstOrDefault(ms => ms.Index == sreq.StreamIndex && ms.Type == sreq.StreamType);
            if (match == null)
                throw new InvalidOperationException($"{sreq.StreamType} stream with index {sreq.StreamIndex} not found in file {sreq.InputFilePath}");

            builder.WithStream(match);
            if (match.Type == StreamType.Video && match.Duration > representativeDuration)
                representativeDuration = match.Duration;
        }

        if (representativeDuration == TimeSpan.Zero)
        {
            // Fallback to longest stream if no video selected (ensure cache populated first)
            representativeDuration = mediaInfoCache.Values.SelectMany(v => v.Streams).DefaultIfEmpty().Max(s => s?.Duration ?? TimeSpan.Zero);
        }

        var process = builder.Encode();
        _activeProcesses.TryAdd(process, representativeDuration);

        return Path.GetRelativePath(_downloadsPath, outputFile);
    }
}
