using Haas.Media.Core;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Encodings;

internal sealed class EncodingTaskExecutor : IBackgroundTaskExecutor<EncodingTask, EncodingProcessInfo>
{
    private readonly ILogger<EncodingTaskExecutor> _logger;

    public EncodingTaskExecutor(ILogger<EncodingTaskExecutor> logger)
    {
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<EncodingTask, EncodingProcessInfo> context
    )
    {
        var cancellationToken = context.CancellationToken;
        var task = context.Task;

        var sourceFilePaths = task.Streams.Select(s => s.InputFilePath).Distinct().ToArray();
        var videoStreamFilePath = task
            .Streams.Single(s => s.StreamType == StreamType.Video)
            .InputFilePath;

        if (File.Exists(task.OutputPath))
        {
            File.Delete(task.OutputPath);
        }

        var builder = MediaEncodingBuilder
            .Create()
            .ToFileOutput(task.OutputPath)
            .WithVideoCodec(task.VideoCodec)
            .WithHardwareAcceleration(task.HardwareAcceleration, task.Device);

        MediaInfo.Stream? videoStream = null;
        string? videoSourceFilePath = null;
        foreach (var sourceFilePath in sourceFilePaths)
        {
            context.ThrowIfCancellationRequested();

            builder.FromFileInput(sourceFilePath);

            var mediaInfo = await MediaManager.GetMediaInfoAsync(sourceFilePath);
            var sourceFileStreamIndexes = task
                .Streams.Where(s => s.InputFilePath == sourceFilePath)
                .Select(s => s.StreamIndex)
                .ToArray();
            var selectedStreams = mediaInfo
                .Streams.Where(s => sourceFileStreamIndexes.Contains(s.Index))
                .ToArray();

            if (!selectedStreams.Any())
            {
                throw new InvalidOperationException(
                    $"Unable to resolve streams for encoding task {task.Id}."
                );
            }

            if (videoStream is null)
            {
                videoSourceFilePath = sourceFilePath;
                videoStream = mediaInfo.Streams.First(s => s.Type == StreamType.Video);
            }

            foreach (var stream in selectedStreams)
            {
                builder.WithStream(stream);
            }
        }

        var info = new EncodingProcessInfo
        {
            Id = task.Id.ToString(),
            SourcePath = videoSourceFilePath!,
            OutputPath = task.OutputPath,
            Progress = 0,
            ElapsedTimeSeconds = 0,
            EstimatedTimeSeconds = 0,
        };

        var startTime = DateTime.UtcNow;

        context.State.StartedAt = DateTimeOffset.UtcNow;
        context.ReportStatus(BackgroundTaskStatus.Running);
        context.SetPayload(info);

        var lastErrorLine = string.Empty;
        var process = builder.Encode();

        process.OutputDataReceived += (sender, data) =>
        {
            if (!string.IsNullOrWhiteSpace(data))
            {
                _logger.LogInformation(data);
            }
        };

        process.ErrorDataReceived += (_, data) =>
        {
            if (string.IsNullOrWhiteSpace(data))
            {
                return;
            }

            _logger.LogInformation(data);

            var progress = MediaHelper.ParseProgress(data, videoStream!);
            if (progress.HasValue)
            {
                info.Progress = progress.Value;
                info.ElapsedTimeSeconds = Math.Max(0, (DateTime.UtcNow - startTime).TotalSeconds);

                var progressFraction = info.Progress / 100.0;
                if (progressFraction > 0)
                {
                    var totalEstimate = info.ElapsedTimeSeconds / progressFraction;
                    info.EstimatedTimeSeconds = Math.Max(
                        0,
                        totalEstimate - info.ElapsedTimeSeconds
                    );
                }
                else
                {
                    info.EstimatedTimeSeconds = 0;
                }

                context.SetPayload(info);
                context.ReportProgress(info.Progress);
            }
            else
            {
                lastErrorLine = data.Trim();
            }
        };

        using var registration = cancellationToken.Register(() =>
        {
            try
            {
                process.Kill();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to kill encoding process {TaskId} for {SourcePath}",
                    info.Id,
                    videoSourceFilePath
                );
            }
        });

        try
        {
            var result = await process.WaitForExitAsync(cancellationToken);

            info.Progress = 100;
            info.ElapsedTimeSeconds = Math.Max(0, (DateTime.UtcNow - startTime).TotalSeconds);
            info.EstimatedTimeSeconds = 0;

            context.SetPayload(info);
            context.ReportProgress(info.Progress);

            if (result.ExitCode == 0)
            {
                context.ReportStatus(BackgroundTaskStatus.Completed);
            }
            else
            {
                var errorMessage = !string.IsNullOrWhiteSpace(lastErrorLine)
                    ? lastErrorLine
                    : $"ffmpeg exited with code {result.ExitCode}";
                context.State.ErrorMessage = errorMessage;
                context.ReportStatus(BackgroundTaskStatus.Failed);
                if (File.Exists(info.OutputPath))
                {
                    File.Delete(info.OutputPath);
                }
                _logger.LogError(
                    "Encoding task {TaskId} failed with exit code {ExitCode}: {Message}",
                    info.Id,
                    result.ExitCode,
                    errorMessage
                );
            }
        }
        catch (OperationCanceledException)
        {
            info.EstimatedTimeSeconds = 0;
            context.SetPayload(info);
            context.ReportStatus(BackgroundTaskStatus.Cancelled);

            if (File.Exists(info.OutputPath))
            {
                File.Delete(info.OutputPath);
            }
            throw;
        }
        catch (Exception ex)
        {
            info.EstimatedTimeSeconds = 0;
            context.SetPayload(info);
            context.State.ErrorMessage = !string.IsNullOrWhiteSpace(lastErrorLine)
                ? lastErrorLine
                : ex.Message;
            context.ReportStatus(BackgroundTaskStatus.Failed);

            if (File.Exists(info.OutputPath))
            {
                File.Delete(info.OutputPath);
            }

            _logger.LogError(
                ex,
                "Encoding task {TaskId} failed for {SourcePath}: {Message}",
                info.Id,
                videoSourceFilePath,
                context.State.ErrorMessage
            );

            throw;
        }
    }
}
