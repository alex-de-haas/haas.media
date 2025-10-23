using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Files;

internal sealed class CopyOperationTaskExecutor
    : IBackgroundTaskExecutor<CopyOperationTask, CopyOperationInfo>
{
    private readonly ILogger<CopyOperationTaskExecutor> _logger;
    private const int ProgressUpdateIntervalBytes = 1024 * 1024 * 5; // Update every 5 MB

    public CopyOperationTaskExecutor(ILogger<CopyOperationTaskExecutor> logger)
    {
        _logger = logger;
    }

    public Task ExecuteAsync(BackgroundWorkerContext<CopyOperationTask, CopyOperationInfo> context)
    {
        long totalBytes;
        int totalFiles;

        if (context.Task.IsDirectory)
        {
            var dirInfo = CalculateDirectorySize(context.Task.SourceFullPath);
            totalBytes = dirInfo.TotalBytes;
            totalFiles = dirInfo.TotalFiles;
        }
        else
        {
            var fileInfo = new FileInfo(context.Task.SourceFullPath);
            totalBytes = fileInfo.Length;
            totalFiles = 1;
        }

        var task = context.Task;
        var initialOperation = new CopyOperationInfo(
            task.Id.ToString(),
            task.SourcePath,
            task.DestinationPath,
            totalBytes,
            0, // CopiedBytes
            DateTime.UtcNow, // StartTime
            null, // CompletedTime
            task.IsDirectory,
            totalFiles,
            0, // CopiedFiles
            null // CurrentPath
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
            long lastProgressUpdate = 0;
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

                // Update progress every 5 MB or when complete
                var totalBytes = context.State.Payload?.TotalBytes ?? 0;
                var isComplete = totalCopied >= totalBytes;
                var shouldUpdate =
                    isComplete || (totalCopied - lastProgressUpdate) >= ProgressUpdateIntervalBytes;

                if (shouldUpdate)
                {
                    UpdateProgress(
                        context,
                        task,
                        totalBytes,
                        totalCopied,
                        isComplete ? 1 : 0,
                        Path.GetFileName(destinationFullPath)
                    );
                    lastProgressUpdate = totalCopied;
                }
            }

            // Final progress update to ensure accurate speed/ETA before completion
            var finalTotalBytes = context.State.Payload?.TotalBytes ?? 0;
            UpdateProgress(
                context,
                task,
                finalTotalBytes,
                totalCopied,
                1,
                Path.GetFileName(destinationFullPath)
            );

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
            long lastProgressUpdate = 0;
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

                using var sourceStream = new FileStream(sourceFile, FileMode.Open, FileAccess.Read);
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

                    // Update progress every 5 MB
                    var shouldUpdate =
                        (totalCopied - lastProgressUpdate) >= ProgressUpdateIntervalBytes;
                    if (shouldUpdate)
                    {
                        UpdateProgress(
                            context,
                            task,
                            context.State.Payload?.TotalBytes ?? 0,
                            totalCopied,
                            filesCopied,
                            Path.Combine(task.DestinationPath, relativePath)
                        );
                        lastProgressUpdate = totalCopied;
                    }
                }

                filesCopied++;

                // Always update progress after each file completes
                UpdateProgress(
                    context,
                    task,
                    context.State.Payload?.TotalBytes ?? 0,
                    totalCopied,
                    filesCopied,
                    Path.Combine(task.DestinationPath, relativePath)
                );
                lastProgressUpdate = totalCopied;
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

        var baseOperation =
            context.State.Payload
            ?? new CopyOperationInfo(
                task.Id.ToString(),
                task.SourcePath,
                task.DestinationPath,
                context.State.Payload?.TotalBytes ?? 0,
                0, // CopiedBytes
                startedAt,
                null, // CompletedTime
                task.IsDirectory,
                context.State.Payload?.TotalFiles ?? 0,
                0, // CopiedFiles
                null // CurrentPath
            );

        var updatedOperation = baseOperation with
        {
            CopiedBytes = copiedBytes,
            CopiedFiles = copiedFiles,
            CurrentPath = currentPath,
        };
        context.SetPayload(updatedOperation);

        var progress = totalBytes > 0 ? (double)copiedBytes / Math.Max(1, totalBytes) * 100.0 : 0.0;

        context.ReportProgress(progress);
    }

    private (long TotalBytes, int TotalFiles) CalculateDirectorySize(string directoryPath)
    {
        long totalBytes = 0;
        int totalFiles = 0;

        try
        {
            var files = Directory.GetFiles(directoryPath, "*", SearchOption.AllDirectories);
            foreach (var file in files)
            {
                var fileInfo = new FileInfo(file);
                totalBytes += fileInfo.Length;
                totalFiles++;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Error calculating directory size for {DirectoryPath}",
                directoryPath
            );
        }

        return (totalBytes, totalFiles);
    }
}
