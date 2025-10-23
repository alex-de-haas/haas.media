using Haas.Media.Core;
using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Core.Helpers;

namespace Haas.Media.Services.Encodings;

public class EncodingService : IEncodingApi
{
    private readonly string _dataPath;
    private readonly string _encodingsPath;
    private readonly IBackgroundTaskManager _backgroundTaskManager;
    private readonly ILogger<EncodingService> _logger;

    public EncodingService(
        IBackgroundTaskManager backgroundTaskManager,
        IConfiguration configuration,
        ILogger<EncodingService> logger
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _encodingsPath = Path.Combine(_dataPath, "Encodings");

        _backgroundTaskManager = backgroundTaskManager;
        _logger = logger;

        Directory.CreateDirectory(_encodingsPath);
        _logger.LogInformation(
            "Encoding service initialized with path: {EncodingsPath}",
            _encodingsPath
        );
    }

    public async Task<EncodingInfo> GetEncodingInfoAsync(string relativePath)
    {
        var path = Path.Combine(_dataPath, relativePath);
        var isDirectory = Directory.Exists(path);

        var filesInfo = isDirectory
            ? Directory
                .EnumerateFiles(path, "*.*", SearchOption.AllDirectories)
                .Where(FileHelper.IsMediaFile)
                .ToArray()
            : FileHelper.IsMediaFile(path)
                ? [path]
                : [];
        var files = filesInfo
            .Select(f =>
            {
                var fileInfo = new FileInfo(f);
                var relative = Path.GetRelativePath(_dataPath, f);
                return new EncodingInfo.MediaFileInfo
                {
                    Name = fileInfo.Name,
                    RelativePath = relative,
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
                Path.Combine(_dataPath, file.RelativePath)
            );
        }

        var result = new EncodingInfo
        {
            HardwareAccelerations = await MediaHelper.GetHardwareAccelerationInfoAsync(),
            MediaFiles = files.OrderBy(f => f.Name).ToArray(),
        };

        return result;
    }

    public Task StartEncodingAsync(EncodeRequest request, CancellationToken ct = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (request.Streams is null || request.Streams.Length == 0)
        {
            throw new ArgumentException("At least one stream must be specified", nameof(request));
        }

        ct.ThrowIfCancellationRequested();

        var videoFiles = request
            .Streams.Where(x => x.StreamType == StreamType.Video)
            .Select(x => x.InputFilePath)
            .Distinct()
            .ToArray();

        if (videoFiles.Length == 0)
        {
            throw new ArgumentException(
                "At least one video file must be specified",
                nameof(request)
            );
        }

        foreach (var videoFile in videoFiles)
        {
            ct.ThrowIfCancellationRequested();

            var fileStreams = request.Streams.Where(x => x.InputFilePath == videoFile).ToArray();

            var taskStreams = fileStreams
                .Select(s => new EncodingTask.Stream
                {
                    InputFilePath = Path.Combine(_dataPath, s.InputFilePath),
                    StreamIndex = s.StreamIndex,
                    StreamType = s.StreamType,
                })
                .ToArray();

            var outputFileName = Path.GetFileNameWithoutExtension(videoFile) + ".mkv";
            var outputFullPath = Path.Combine(_encodingsPath, outputFileName);

            var encodingTask = new EncodingTask(
                outputFullPath,
                taskStreams,
                request.VideoCodec,
                request.HardwareAcceleration,
                request.Device,
                request.VideoBitrate,
                request.Crf,
                request.Resolution
            );

            var taskId = _backgroundTaskManager.RunTask<EncodingTask, EncodingProcessInfo>(
                encodingTask
            );
            _logger.LogInformation(
                "Queued encoding task {TaskId} for {SourcePath}",
                taskId,
                videoFile
            );
        }

        return Task.CompletedTask;
    }

    public EncodingProcessInfo[] GetEncodingsAsync()
    {
        var tasks = _backgroundTaskManager.GetTasks(nameof(EncodingTask));

        return tasks
            .OfType<BackgroundTaskState<EncodingProcessInfo>>()
            .Where(t =>
                t.Status is BackgroundTaskStatus.Pending or BackgroundTaskStatus.Running
                && t.Payload is not null
            )
            .Select(t => t.Payload!)
            .ToArray();
    }

    public Task StopEncodingAsync(string id)
    {
        if (!Guid.TryParse(id, out var taskId))
        {
            _logger.LogWarning("Invalid encoding task id {TaskId}", id);
            return Task.CompletedTask;
        }

        if (_backgroundTaskManager.CancelTask(taskId))
        {
            _logger.LogInformation("Cancellation requested for encoding task {TaskId}", taskId);
        }
        else
        {
            _logger.LogWarning(
                "Encoding task {TaskId} could not be found for cancellation",
                taskId
            );
        }

        return Task.CompletedTask;
    }
}
