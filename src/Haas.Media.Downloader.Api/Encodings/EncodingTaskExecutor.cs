using Haas.Media.Core;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Encodings;

internal sealed class EncodingTaskExecutor
    : IBackgroundWorker<EncodingTask, EncodingProcessInfo>
{
    private readonly EncodingPaths _paths;
    private readonly ILogger<EncodingTaskExecutor> _logger;

    public EncodingTaskExecutor(
        EncodingPaths paths,
        ILogger<EncodingTaskExecutor> logger
    )
    {
        _paths = paths;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<EncodingTask, EncodingProcessInfo> context
    )
    {
        var cancellationToken = context.CancellationToken;
        var task = context.Task;

        var sourceFilePath = Path.Combine(_paths.DataPath, task.SourceRelativePath);
        var outputFileName = Path.GetFileNameWithoutExtension(sourceFilePath) + ".mkv";
        var outputFullPath = Path.Combine(_paths.OutputPath, outputFileName);
        Directory.CreateDirectory(_paths.OutputPath);

        var streamIndexes = task.Streams.Select(s => s.StreamIndex).ToArray();
        if (streamIndexes.Length == 0)
        {
            throw new InvalidOperationException(
                $"No streams provided for encoding task {task.Id}."
            );
        }

        var mediaInfo = await MediaManager.GetMediaInfoAsync(sourceFilePath);
        context.ThrowIfCancellationRequested();

        var selectedStreams = mediaInfo
            .Streams
            .Where(s => streamIndexes.Contains(s.Index))
            .ToArray();
        if (!selectedStreams.Any())
        {
            throw new InvalidOperationException(
                $"Unable to resolve streams for encoding task {task.Id}."
            );
        }

        var videoStream = selectedStreams.FirstOrDefault(s => s.Type == StreamType.Video)
            ?? throw new InvalidOperationException(
                $"No video stream found for encoding task {task.Id}."
            );

        if (File.Exists(outputFullPath))
        {
            File.Delete(outputFullPath);
        }

        var builder = MediaEncodingBuilder
            .Create()
            .FromFileInput(sourceFilePath)
            .ToFileOutput(outputFullPath)
            .WithVideoCodec(task.VideoCodec)
            .WithHardwareAcceleration(task.HardwareAcceleration, task.Device);

        foreach (var stream in selectedStreams)
        {
            builder.WithStream(stream);
        }

        var info = new EncodingProcessInfo
        {
            Id = task.Id.ToString(),
            SourcePath = sourceFilePath,
            OutputPath = outputFullPath,
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

            var progress = MediaHelper.ParseProgress(data, videoStream);
            if (progress.HasValue)
            {
                info.Progress = progress.Value;
                info.ElapsedTimeSeconds = Math.Max(0, (DateTime.UtcNow - startTime).TotalSeconds);

                var progressFraction = info.Progress / 100.0;
                if (progressFraction > 0)
                {
                    var totalEstimate = info.ElapsedTimeSeconds / progressFraction;
                    info.EstimatedTimeSeconds = Math.Max(0, totalEstimate - info.ElapsedTimeSeconds);
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
                    sourceFilePath
                );
            }
        });

        try
        {
            var result = await process.WaitForExitAsync(cancellationToken);

            info.Progress = 100;
            info.ElapsedTimeSeconds = Math.Max(
                0,
                (DateTime.UtcNow - startTime).TotalSeconds
            );
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
                sourceFilePath,
                context.State.ErrorMessage
            );

            throw;
        }
    }
}
