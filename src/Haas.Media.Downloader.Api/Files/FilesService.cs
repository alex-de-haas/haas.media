using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Files;

public class FilesService : IFilesApi, IHostedService
{
    private readonly string _dataPath;
    private readonly ILogger<FilesService> _logger;
    private readonly IHubContext<FileHub> _hubContext;
    private readonly ConcurrentDictionary<string, CopyOperationInfo> _copyOperations;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens;
    private Timer? _broadcastTimer;

    public FilesService(
        IConfiguration configuration,
        ILogger<FilesService> logger,
        IHubContext<FileHub> hubContext
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _logger = logger;
        _hubContext = hubContext;
        _copyOperations = new ConcurrentDictionary<string, CopyOperationInfo>();
        _cancellationTokens = new ConcurrentDictionary<string, CancellationTokenSource>();

        // Ensure root directory exists
        Directory.CreateDirectory(_dataPath);

        _logger.LogInformation("Files service initialized with root path: {RootPath}", _dataPath);
    }

    public FileItem[] GetFiles(string? path = null)
    {
        var targetPath = string.IsNullOrEmpty(path) ? _dataPath : Path.Combine(_dataPath, path);

        if (!Directory.Exists(targetPath))
        {
            _logger.LogWarning("Directory not found: {Path}", targetPath);
            return [];
        }

        // Ensure we're not accessing outside the root path
        var fullTargetPath = Path.GetFullPath(targetPath);
        var fullRootPath = Path.GetFullPath(_dataPath);

        if (!fullTargetPath.StartsWith(fullRootPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "Access to path outside root directory is not allowed"
            );
        }

        var files = new List<FileItem>();

        // Add directories
        foreach (var directory in Directory.GetDirectories(targetPath))
        {
            var dirInfo = new DirectoryInfo(directory);
            if (dirInfo.Attributes.HasFlag(FileAttributes.Hidden) || dirInfo.Name.StartsWith('.'))
            {
                continue; // Skip hidden directories
            }

            var relativePath = Path.GetRelativePath(_dataPath, directory);
            files.Add(
                new FileItem(dirInfo.Name, null, relativePath, null, dirInfo.LastWriteTimeUtc, true)
            );
        }

        // Add files
        foreach (var file in Directory.GetFiles(targetPath))
        {
            var fileInfo = new FileInfo(file);
            if (fileInfo.Attributes.HasFlag(FileAttributes.Hidden) || fileInfo.Name.StartsWith('.'))
            {
                continue; // Skip hidden files
            }

            var relativePath = Path.GetRelativePath(_dataPath, file);

            files.Add(
                new FileItem(
                    fileInfo.Name,
                    fileInfo.Extension,
                    relativePath,
                    fileInfo.Length,
                    fileInfo.LastWriteTimeUtc,
                    false
                )
            );
        }

        return files.OrderBy(f => f.IsDirectory ? 0 : 1).ThenBy(f => f.Name).ToArray();
    }

    public async Task<string> StartCopyAsync(string sourcePath, string destinationPath)
    {
        var sourceFullPath = GetValidatedFullPath(sourcePath);
        var destinationFullPath = GetValidatedFullPath(destinationPath);

        bool isDirectory = Directory.Exists(sourceFullPath);
        bool isFile = File.Exists(sourceFullPath);

        if (!isDirectory && !isFile)
        {
            throw new FileNotFoundException($"Source not found: {sourcePath}");
        }

        // Create destination directory if it doesn't exist
        var destinationDir = isDirectory
            ? destinationFullPath
            : Path.GetDirectoryName(destinationFullPath);
        if (!string.IsNullOrEmpty(destinationDir))
        {
            Directory.CreateDirectory(destinationDir);
        }

        var operationId = Guid.NewGuid().ToString();
        long totalBytes = 0;
        int totalFiles = 0;

        if (isDirectory)
        {
            var dirInfo = CalculateDirectorySize(sourceFullPath);
            totalBytes = dirInfo.TotalBytes;
            totalFiles = dirInfo.TotalFiles;
        }
        else
        {
            var fileInfo = new FileInfo(sourceFullPath);
            totalBytes = fileInfo.Length;
            totalFiles = 1;
        }

        var copyOperation = new CopyOperationInfo(
            operationId,
            sourcePath,
            destinationPath,
            totalBytes,
            0,
            0.0,
            CopyOperationState.Running,
            DateTime.UtcNow,
            IsDirectory: isDirectory,
            TotalFiles: totalFiles,
            CopiedFiles: 0
        );

        _copyOperations.TryAdd(operationId, copyOperation);
        var cancellationTokenSource = new CancellationTokenSource();
        _cancellationTokens.TryAdd(operationId, cancellationTokenSource);

        // Start the copy operation in the background
        if (isDirectory)
        {
            _ = Task.Run(async () =>
                await PerformDirectoryCopyOperationAsync(
                    operationId,
                    sourceFullPath,
                    destinationFullPath,
                    cancellationTokenSource.Token
                )
            );
        }
        else
        {
            _ = Task.Run(async () =>
                await PerformFileCopyOperationAsync(
                    operationId,
                    sourceFullPath,
                    destinationFullPath,
                    totalBytes,
                    cancellationTokenSource.Token
                )
            );
        }

        // Broadcast initial operation state
        await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", copyOperation);

        return operationId;
    }

    public CopyOperationInfo[] GetCopyOperations()
    {
        return _copyOperations.Values.ToArray();
    }

    public async Task<bool> CancelCopyOperationAsync(string operationId)
    {
        if (_cancellationTokens.TryGetValue(operationId, out var cancellationTokenSource))
        {
            cancellationTokenSource.Cancel();

            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var cancelledOperation = operation with
                {
                    State = CopyOperationState.Cancelled,
                    CompletedTime = DateTime.UtcNow,
                };
                _copyOperations.TryUpdate(operationId, cancelledOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", cancelledOperation);

                // Remove the cancelled operation after a short delay
                _ = Task.Run(async () =>
                {
                    await Task.Delay(3000); // Wait 3 seconds
                    _copyOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
                });
            }

            return true;
        }
        return false;
    }

    private async Task PerformFileCopyOperationAsync(
        string operationId,
        string sourceFullPath,
        string destinationFullPath,
        long totalBytes,
        CancellationToken cancellationToken
    )
    {
        try
        {
            using var sourceStream = new FileStream(sourceFullPath, FileMode.Open, FileAccess.Read);
            using var destinationStream = new FileStream(
                destinationFullPath,
                FileMode.CreateNew,
                FileAccess.Write
            );

            var buffer = new byte[81920]; // 80KB buffer
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

                var progress = totalBytes > 0 ? (double)totalCopied / totalBytes * 100.0 : 0.0;

                if (_copyOperations.TryGetValue(operationId, out var currentOperation))
                {
                    var updatedOperation = currentOperation with
                    {
                        CopiedBytes = totalCopied,
                        Progress = progress,
                        CopiedFiles = totalCopied == totalBytes ? 1 : 0,
                    };
                    _copyOperations.TryUpdate(operationId, updatedOperation, currentOperation);
                }
            }

            // Mark as completed and then remove after a short delay
            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var completedOperation = operation with
                {
                    State = CopyOperationState.Completed,
                    Progress = 100.0,
                    CopiedBytes = totalBytes,
                    CopiedFiles = 1,
                    CompletedTime = DateTime.UtcNow,
                };
                _copyOperations.TryUpdate(operationId, completedOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", completedOperation);

                _logger.LogInformation(
                    "File copy completed: {OperationId} from {Source} to {Destination}",
                    operationId,
                    sourceFullPath,
                    destinationFullPath
                );

                // Remove the completed operation after a short delay to allow clients to see the completion
                _ = Task.Run(async () =>
                {
                    await Task.Delay(3000); // Wait 3 seconds
                    _copyOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
                });
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("File copy cancelled: {OperationId}", operationId);
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

            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var failedOperation = operation with
                {
                    State = CopyOperationState.Failed,
                    CompletedTime = DateTime.UtcNow,
                    ErrorMessage = ex.Message,
                };
                _copyOperations.TryUpdate(operationId, failedOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", failedOperation);

                // Remove the failed operation after a delay to allow clients to see the error
                _ = Task.Run(async () =>
                {
                    await Task.Delay(10000); // Wait 10 seconds for errors
                    _copyOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
                });
            }
        }
        finally
        {
            _cancellationTokens.TryRemove(operationId, out _);
        }
    }

    public async Task BroadcastCopyOperationsAsync()
    {
        foreach (var operation in _copyOperations.Values)
        {
            await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", operation);
        }
    }

    private void CleanupOldOperations()
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-5); // Remove operations older than 5 minutes that weren't auto-removed
        var operationsToRemove = _copyOperations
            .Values.Where(op =>
                op.State != CopyOperationState.Running
                && op.CompletedTime.HasValue
                && op.CompletedTime.Value < cutoffTime
            )
            .Select(op => op.Id)
            .ToList();

        foreach (var operationId in operationsToRemove)
        {
            _copyOperations.TryRemove(operationId, out _);
        }
    }

    public void Move(string sourcePath, string destinationPath)
    {
        var sourceFullPath = GetValidatedFullPath(sourcePath);
        var destinationFullPath = GetValidatedFullPath(destinationPath);

        bool isDirectory = Directory.Exists(sourceFullPath);
        bool isFile = File.Exists(sourceFullPath);

        if (!isDirectory && !isFile)
        {
            throw new FileNotFoundException($"Source not found: {sourcePath}");
        }

        // Create destination directory if it doesn't exist
        var destinationDir = isDirectory
            ? Path.GetDirectoryName(destinationFullPath)
            : Path.GetDirectoryName(destinationFullPath);
        if (!string.IsNullOrEmpty(destinationDir))
        {
            Directory.CreateDirectory(destinationDir);
        }

        if (isDirectory)
        {
            Directory.Move(sourceFullPath, destinationFullPath);
            _logger.LogInformation(
                "Directory moved from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
        }
        else
        {
            File.Move(sourceFullPath, destinationFullPath, overwrite: false);
            _logger.LogInformation(
                "File moved from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
        }
    }

    public void RenameFile(string relativePath, string newName)
    {
        var oldFullPath = GetValidatedFullPath(relativePath);

        // Validate new name
        if (string.IsNullOrWhiteSpace(newName))
        {
            throw new ArgumentException("New name cannot be null or empty", nameof(newName));
        }

        // Prevent directory traversal and invalid characters in the new name
        if (
            newName.Contains("..")
            || newName.Contains(Path.DirectorySeparatorChar)
            || newName.Contains(Path.AltDirectorySeparatorChar)
            || newName.IndexOfAny(Path.GetInvalidFileNameChars()) >= 0
        )
        {
            throw new ArgumentException("New name contains invalid characters", nameof(newName));
        }

        var oldName = Path.GetFileName(oldFullPath);
        var newFullPath = Path.Combine(Path.GetDirectoryName(oldFullPath)!, newName);

        bool isDirectory = Directory.Exists(oldFullPath);
        bool isFile = File.Exists(oldFullPath);

        if (!isDirectory && !isFile)
        {
            throw new FileNotFoundException($"File or directory not found: {relativePath}");
        }

        // Check if destination already exists
        if (File.Exists(newFullPath) || Directory.Exists(newFullPath))
        {
            throw new InvalidOperationException(
                $"A file or directory with the name '{newName}' already exists"
            );
        }

        if (isDirectory)
        {
            Directory.Move(oldFullPath, newFullPath);
            _logger.LogInformation(
                "Directory renamed from {OldName} to {NewName}",
                oldName,
                newName
            );
        }
        else
        {
            File.Move(oldFullPath, newFullPath, overwrite: false);
            _logger.LogInformation("File renamed from {OldName} to {NewName}", oldName, newName);
        }
    }

    public void Delete(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        bool isDirectory = Directory.Exists(fullPath);
        bool isFile = File.Exists(fullPath);

        if (!isDirectory && !isFile)
        {
            throw new FileNotFoundException($"Path not found: {relativePath}");
        }

        if (isDirectory)
        {
            Directory.Delete(fullPath, recursive: true);
            _logger.LogInformation("Directory deleted: {Path}", relativePath);
        }
        else
        {
            File.Delete(fullPath);
            _logger.LogInformation("File deleted: {Path}", relativePath);
        }
    }

    public void CreateDirectory(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        Directory.CreateDirectory(fullPath);
        _logger.LogInformation("Directory created: {Path}", relativePath);
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

    private async Task PerformDirectoryCopyOperationAsync(
        string operationId,
        string sourceFullPath,
        string destinationFullPath,
        CancellationToken cancellationToken
    )
    {
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

                    var fileInfo = new FileInfo(sourceFile);
                    long fileCopied = 0;

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

                    var buffer = new byte[81920]; // 80KB buffer
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
                        fileCopied += bytesRead;
                        totalCopied += bytesRead;

                        var progress =
                            initialOperation.TotalBytes > 0
                                ? (double)totalCopied / initialOperation.TotalBytes * 100.0
                                : 0.0;

                        if (_copyOperations.TryGetValue(operationId, out var currentOperation))
                        {
                            var updatedOperation = currentOperation with
                            {
                                CopiedBytes = totalCopied,
                                Progress = progress,
                                CopiedFiles = filesCopied,
                            };
                            _copyOperations.TryUpdate(
                                operationId,
                                updatedOperation,
                                currentOperation
                            );
                        }
                    }

                    filesCopied++;
                }

                // Mark as completed
                if (_copyOperations.TryGetValue(operationId, out var operation))
                {
                    var completedOperation = operation with
                    {
                        State = CopyOperationState.Completed,
                        Progress = 100.0,
                        CopiedBytes = totalCopied,
                        CopiedFiles = filesCopied,
                        CompletedTime = DateTime.UtcNow,
                    };
                    _copyOperations.TryUpdate(operationId, completedOperation, operation);
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

                    // Remove the completed operation after a short delay
                    _ = Task.Run(async () =>
                    {
                        await Task.Delay(3000);
                        _copyOperations.TryRemove(operationId, out _);
                        await _hubContext.Clients.All.SendAsync(
                            "CopyOperationDeleted",
                            operationId
                        );
                    });
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Directory copy cancelled: {OperationId}", operationId);
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

            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var failedOperation = operation with
                {
                    State = CopyOperationState.Failed,
                    CompletedTime = DateTime.UtcNow,
                    ErrorMessage = ex.Message,
                };
                _copyOperations.TryUpdate(operationId, failedOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", failedOperation);

                _ = Task.Run(async () =>
                {
                    await Task.Delay(10000);
                    _copyOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
                });
            }
        }
        finally
        {
            _cancellationTokens.TryRemove(operationId, out _);
        }
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Files service is starting");

        // Start broadcast timer for copy operations
        _broadcastTimer ??= new Timer(
            async _ =>
            {
                try
                {
                    await BroadcastCopyOperationsAsync();
                    CleanupOldOperations();
                }
                catch
                {
                    // swallow to avoid crashing the timer thread
                }
            },
            null,
            TimeSpan.Zero,
            TimeSpan.FromSeconds(1)
        );

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Files service is stopping");

        // Stop broadcast timer
        _broadcastTimer?.Change(Timeout.Infinite, Timeout.Infinite);
        _broadcastTimer?.Dispose();
        _broadcastTimer = null;

        // Cancel all active copy operations
        foreach (var cancellationTokenSource in _cancellationTokens.Values)
        {
            try
            {
                cancellationTokenSource.Cancel();
            }
            catch
            {
                // ignore individual cancellation failures
            }
        }

        _cancellationTokens.Clear();
        return Task.CompletedTask;
    }

    private string GetValidatedFullPath(string relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
        {
            throw new ArgumentException("Path cannot be null or empty", nameof(relativePath));
        }

        // Prevent directory traversal attacks
        if (relativePath.Contains("..") || Path.IsPathRooted(relativePath))
        {
            throw new ArgumentException("Invalid path", nameof(relativePath));
        }

        var fullPath = Path.Combine(_dataPath, relativePath);
        var resolvedPath = Path.GetFullPath(fullPath);
        var rootPath = Path.GetFullPath(_dataPath);

        // Ensure the resolved path is within the root directory
        if (!resolvedPath.StartsWith(rootPath, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException(
                "Access to path outside root directory is not allowed"
            );
        }

        return resolvedPath;
    }
}
