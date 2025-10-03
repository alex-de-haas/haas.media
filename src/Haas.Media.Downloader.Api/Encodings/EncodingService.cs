using Haas.Media.Core;
using Haas.Media.Core.Helpers;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Encodings;

public class EncodingService : IEncodingApi
{
    private readonly EncodingPaths _paths;
    private readonly IBackgroundTaskManager _backgroundTaskManager;
    private readonly ILogger<EncodingService> _logger;

    public EncodingService(
        EncodingPaths paths,
        IBackgroundTaskManager backgroundTaskManager,
        ILogger<EncodingService> logger
    )
    {
        _paths = paths;
        _backgroundTaskManager = backgroundTaskManager;
        _logger = logger;
    }

    public async Task<EncodingInfo> GetEncodingInfoAsync(string relativePath)
    {
        var path = Path.Combine(_paths.DataPath, relativePath);
        var isDirectory = Directory.Exists(path);

        var filesInfo =
            isDirectory
                ? Directory
                    .EnumerateFiles(path, "*.*", SearchOption.AllDirectories)
                    .Where(FileHelper.IsMediaFile)
                    .ToArray()
            : FileHelper.IsMediaFile(path) ? [path]
            : [];
        var files = filesInfo
            .Select(f =>
            {
                var fileInfo = new FileInfo(f);
                var relative = Path.GetRelativePath(_paths.DataPath, f);
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
                Path.Combine(_paths.DataPath, file.RelativePath)
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
            throw new ArgumentException(
                "At least one stream must be specified",
                nameof(request)
            );
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

            var fileStreams = request
                .Streams.Where(x => x.InputFilePath == videoFile)
                .ToArray();

            var encodingTask = new EncodingTask(
                videoFile,
                fileStreams,
                request.VideoCodec,
                request.HardwareAcceleration,
                request.Device
            );

            var taskId = _backgroundTaskManager.RunTask<EncodingTask, EncodingProcessInfo>(encodingTask);
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
            .Where(
                t =>
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
            _logger.LogInformation(
                "Cancellation requested for encoding task {TaskId}",
                taskId
            );
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
