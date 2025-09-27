using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading.Tasks;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace Haas.Media.Downloader.Api.Files;

internal sealed class CopyOperationTaskExecutor
{
    private readonly ConcurrentDictionary<string, CopyOperationInfo> _copyOperations;
    private readonly IHubContext<FileHub> _hubContext;
    private readonly ILogger _logger;

    public CopyOperationTaskExecutor(
        ConcurrentDictionary<string, CopyOperationInfo> copyOperations,
        IHubContext<FileHub> hubContext,
        ILogger logger
    )
    {
        _copyOperations = copyOperations;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task ExecuteFileCopyAsync(
        BackgroundTaskContext taskContext,
        string operationId,
        string sourceFullPath,
        string destinationFullPath,
        long totalBytes
    )
    {
        var cancellationToken = taskContext.CancellationToken;

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

                if (_copyOperations.TryGetValue(operationId, out var currentOperation))
                {
                    var progress = totalBytes > 0 ? (double)totalCopied / totalBytes * 100.0 : 0.0;
                    var elapsedSeconds = (DateTime.UtcNow - currentOperation.StartTime).TotalSeconds;
                    var speed = elapsedSeconds > 0 ? totalCopied / elapsedSeconds : 0;
                    double? eta = null;
                    if (speed > 0)
                    {
                        var remaining = Math.Max(0L, totalBytes - totalCopied);
                        eta = remaining / speed;
                    }

                    var updatedOperation = currentOperation with
                    {
                        CopiedBytes = totalCopied,
                        Progress = progress,
                        CopiedFiles = totalCopied == totalBytes ? 1 : 0,
                        SpeedBytesPerSecond = speed,
                        EstimatedTimeSeconds = eta,
                    };

                    _copyOperations.TryUpdate(operationId, updatedOperation, currentOperation);
                    taskContext.SetPayload(updatedOperation);
                }
            }

            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var completedOperation = operation with
                {
                    State = CopyOperationState.Completed,
                    Progress = 100.0,
                    CopiedBytes = totalBytes,
                    CopiedFiles = 1,
                    CompletedTime = DateTime.UtcNow,
                    EstimatedTimeSeconds = 0,
                };
                _copyOperations.TryUpdate(operationId, completedOperation, operation);
                taskContext.SetPayload(completedOperation);
                taskContext.ReportProgress(100, "Copy completed", completedOperation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", completedOperation);

                _logger.LogInformation(
                    "File copy completed: {OperationId} from {Source} to {Destination}",
                    operationId,
                    sourceFullPath,
                    destinationFullPath
                );

                ScheduleOperationRemoval(operationId, TimeSpan.FromSeconds(3));
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("File copy cancelled: {OperationId}", operationId);
            await MarkCancelledAsync(operationId);
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
            await MarkFailedAsync(operationId, ex.Message);
            throw;
        }
    }

    public async Task ExecuteDirectoryCopyAsync(
        BackgroundTaskContext taskContext,
        string operationId,
        string sourceFullPath,
        string destinationFullPath
    )
    {
        var cancellationToken = taskContext.CancellationToken;

        try
        {
            var files = Directory.GetFiles(sourceFullPath, "*", SearchOption.AllDirectories);
            long totalCopied = 0;
            int filesCopied = 0;

            if (_copyOperations.TryGetValue(operationId, out var initialOperation))
            {
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

                        if (_copyOperations.TryGetValue(operationId, out var currentOperation))
                        {
                            var progress = initialOperation.TotalBytes > 0
                                ? (double)totalCopied / initialOperation.TotalBytes * 100.0
                                : 0.0;
                            var elapsedSeconds = (DateTime.UtcNow - currentOperation.StartTime).TotalSeconds;
                            var speed = elapsedSeconds > 0 ? totalCopied / elapsedSeconds : 0;
                            double? eta = null;
                            if (speed > 0)
                            {
                                var remaining = Math.Max(
                                    0L,
                                    initialOperation.TotalBytes - totalCopied
                                );
                                eta = remaining / speed;
                            }

                            var updatedOperation = currentOperation with
                            {
                                CopiedBytes = totalCopied,
                                Progress = progress,
                                CopiedFiles = filesCopied,
                                SpeedBytesPerSecond = speed,
                                EstimatedTimeSeconds = eta,
                            };

                            _copyOperations.TryUpdate(operationId, updatedOperation, currentOperation);
                            taskContext.SetPayload(updatedOperation);
                        }
                    }

                    filesCopied++;
                }

                if (_copyOperations.TryGetValue(operationId, out var operation))
                {
                    var completedOperation = operation with
                    {
                        State = CopyOperationState.Completed,
                        Progress = 100.0,
                        CopiedBytes = totalCopied,
                        CopiedFiles = filesCopied,
                        CompletedTime = DateTime.UtcNow,
                        EstimatedTimeSeconds = 0,
                    };
                    _copyOperations.TryUpdate(operationId, completedOperation, operation);
                    taskContext.SetPayload(completedOperation);
                    taskContext.ReportProgress(100, "Copy completed", completedOperation);
                    await _hubContext.Clients.All.SendAsync(
                        "CopyOperationUpdated",
                        completedOperation
                    );

                    _logger.LogInformation(
                        "Directory copy completed: {OperationId} from {Source} to {Destination}",
                        operationId,
                        sourceFullPath,
                        destinationFullPath
                    );

                    ScheduleOperationRemoval(operationId, TimeSpan.FromSeconds(3));
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Directory copy cancelled: {OperationId}", operationId);
            await MarkCancelledAsync(operationId);
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
            await MarkFailedAsync(operationId, ex.Message);
            throw;
        }
    }

    private async Task MarkCancelledAsync(string operationId)
    {
        if (_copyOperations.TryGetValue(operationId, out var operation))
        {
            var cancelledOperation = operation with
            {
                State = CopyOperationState.Cancelled,
                CompletedTime = DateTime.UtcNow,
            };
            if (_copyOperations.TryUpdate(operationId, cancelledOperation, operation))
            {
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", cancelledOperation);
                ScheduleOperationRemoval(operationId, TimeSpan.FromSeconds(3));
            }
        }
    }

    private async Task MarkFailedAsync(string operationId, string errorMessage)
    {
        if (_copyOperations.TryGetValue(operationId, out var operation))
        {
            var failedOperation = operation with
            {
                State = CopyOperationState.Failed,
                CompletedTime = DateTime.UtcNow,
                ErrorMessage = errorMessage,
            };
            if (_copyOperations.TryUpdate(operationId, failedOperation, operation))
            {
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", failedOperation);
                ScheduleOperationRemoval(operationId, TimeSpan.FromSeconds(10));
            }
        }
    }

    private void ScheduleOperationRemoval(string operationId, TimeSpan delay)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(delay);
                _copyOperations.TryRemove(operationId, out _);
                await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to clean up copy operation {OperationId}",
                    operationId
                );
            }
        });
    }
}
