using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Files;

internal sealed class CopyOperationTaskExecutor
    : IBackgroundWorker<CopyOperationTask, CopyOperationInfo>
{
    private readonly ILogger<CopyOperationTaskExecutor> _logger;

    public CopyOperationTaskExecutor(ILogger<CopyOperationTaskExecutor> logger)
    {
        _logger = logger;
    }

    public Task ExecuteAsync(
        BackgroundWorkerContext<CopyOperationTask, CopyOperationInfo> context
    )
    {
        var task = context.Task;
        var operationId = task.Id.ToString();
        var initialOperation = new CopyOperationInfo(
            operationId,
            task.SourcePath,
            task.DestinationPath,
            task.TotalBytes,
            CopiedBytes: 0,
            StartTime: DateTime.UtcNow,
            CompletedTime: null,
            IsDirectory: task.IsDirectory,
            TotalFiles: task.TotalFiles,
            CopiedFiles: 0,
            SpeedBytesPerSecond: 0,
            EstimatedTimeSeconds: null,
            CurrentPath: null
        );

        context.SetPayload(initialOperation);

        return task.Kind switch
        {
            CopyOperationTaskKind.File => ExecuteFileCopyAsync(context, task),
            CopyOperationTaskKind.Directory => ExecuteDirectoryCopyAsync(context, task),
            _
                => throw new InvalidOperationException(
                    $"Unsupported copy operation kind: {task.Kind}"
                ),
        };
    }

    private async Task ExecuteFileCopyAsync(
        BackgroundWorkerContext<CopyOperationTask, CopyOperationInfo> context,
        CopyOperationTask task
    )
    {
        var cancellationToken = context.CancellationToken;
        var operationId = task.Id.ToString();
        var sourceFullPath = task.SourceFullPath;
        var destinationFullPath = task.DestinationFullPath;
        var totalBytes = task.TotalBytes;

        try
        {
            using var sourceStream = new FileStream(sourceFullPath, FileMode.Open, FileAccess.Read);
            using var destinationStream = new FileStream(
                destinationFullPath,
                FileMode.CreateNew,
                FileAccess.Write
            );

            var buffer = new byte[81920];
            long totalCopied = 0;
            int bytesRead;

            while (
                (
                    bytesRead = await sourceStream.ReadAsync(
                        buffer,
                        0,
                        buffer.Length,
                        cancellationToken
                    )
                ) > 0
            )
            {
                await destinationStream.WriteAsync(buffer, 0, bytesRead, cancellationToken);
                totalCopied += bytesRead;

                UpdateProgress(
                    context,
                    task,
                    totalBytes,
                    totalCopied,
                    totalCopied == totalBytes ? 1 : 0,
                    Path.GetFileName(destinationFullPath)
                );
            }

            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "File copy completed: {OperationId} from {Source} to {Destination}",
                operationId,
                sourceFullPath,
                destinationFullPath
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("File copy cancelled: {OperationId}", operationId);

            context.ReportStatus(BackgroundTaskStatus.Cancelled);

            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error copying file: {OperationId} from {Source} to {Destination}",
                operationId,
                sourceFullPath,
                destinationFullPath
            );

            context.ReportStatus(BackgroundTaskStatus.Failed);

            throw;
        }
    }

    private async Task ExecuteDirectoryCopyAsync(
        BackgroundWorkerContext<CopyOperationTask, CopyOperationInfo> context,
        CopyOperationTask task
    )
    {
        var cancellationToken = context.CancellationToken;
        var operationId = task.Id.ToString();
        var sourceFullPath = task.SourceFullPath;
        var destinationFullPath = task.DestinationFullPath;

        try
        {
            var files = Directory.GetFiles(sourceFullPath, "*", SearchOption.AllDirectories);
            long totalCopied = 0;
            var filesCopied = 0;

            foreach (var sourceFile in files)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var relativePath = Path.GetRelativePath(sourceFullPath, sourceFile);
                var destinationFile = Path.Combine(destinationFullPath, relativePath);
                var destinationDir = Path.GetDirectoryName(destinationFile);

                if (!string.IsNullOrEmpty(destinationDir))
                {
                    Directory.CreateDirectory(destinationDir);
                }

                using var sourceStream = new FileStream(
                    sourceFile,
                    FileMode.Open,
                    FileAccess.Read
                );
                using var destinationStream = new FileStream(
                    destinationFile,
                    FileMode.CreateNew,
                    FileAccess.Write
                );

                var buffer = new byte[81920];
                int bytesRead;

                while (
                    (
                        bytesRead = await sourceStream.ReadAsync(
                            buffer,
                            0,
                            buffer.Length,
                            cancellationToken
                        )
                    ) > 0
                )
                {
                    await destinationStream.WriteAsync(buffer, 0, bytesRead, cancellationToken);
                    totalCopied += bytesRead;

                    UpdateProgress(
                        context,
                        task,
                        task.TotalBytes,
                        totalCopied,
                        filesCopied,
                        Path.Combine(task.DestinationPath, relativePath)
                    );
                }

                filesCopied++;
            }

            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "Directory copy completed: {OperationId} from {Source} to {Destination}",
                operationId,
                sourceFullPath,
                destinationFullPath
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Directory copy cancelled: {OperationId}", operationId);
            context.ReportStatus(BackgroundTaskStatus.Cancelled);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error copying directory: {OperationId} from {Source} to {Destination}",
                operationId,
                sourceFullPath,
                destinationFullPath
            );
            context.ReportStatus(BackgroundTaskStatus.Failed);
            throw;
        }
    }

    private void UpdateProgress(
        BackgroundWorkerContext<CopyOperationTask, CopyOperationInfo> context,
        CopyOperationTask task,
        long totalBytes,
        long copiedBytes,
        int copiedFiles,
        string? currentPath
    )
    {
        var startedAt = context.State.StartedAt?.UtcDateTime ?? DateTime.UtcNow;
        var elapsedSeconds = (DateTime.UtcNow - startedAt).TotalSeconds;
        var speed = elapsedSeconds > 0 ? copiedBytes / elapsedSeconds : 0;
        double? eta = null;
        if (speed > 0)
        {
            var remainingBytes = Math.Max(0L, totalBytes - copiedBytes);
            eta = remainingBytes / speed;
        }

        var baseOperation = context.State.Payload
            ?? new CopyOperationInfo(
                task.Id.ToString(),
                task.SourcePath,
                task.DestinationPath,
                task.TotalBytes,
                0,
                startedAt,
                IsDirectory: task.IsDirectory,
                TotalFiles: task.TotalFiles
            );

        var updatedOperation = baseOperation with
        {
            CopiedBytes = copiedBytes,
            CopiedFiles = copiedFiles,
            SpeedBytesPerSecond = speed,
            EstimatedTimeSeconds = eta,
            CurrentPath = currentPath,
        };
        context.SetPayload(updatedOperation);

        var progress = totalBytes > 0
            ? (double)copiedBytes / Math.Max(1, totalBytes) * 100.0
            : 0.0;

        context.ReportProgress(progress);
    }
}
