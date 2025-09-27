using System.Collections.Concurrent;
using Haas.Media.Core.Helpers;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Files;

public class FilesService : IFilesApi, IHostedService
{
    private const string CopyTaskName = "File copy operation";
    private readonly string _dataPath;
    private readonly ILogger<FilesService> _logger;
    private readonly IHubContext<FileHub> _hubContext;
    private readonly IBackgroundTaskService _backgroundTaskService;
    private readonly ConcurrentDictionary<string, CopyOperationInfo> _copyOperations;
    private readonly CopyOperationTaskExecutor _copyTaskExecutor;
    private Timer? _broadcastTimer;

    public FilesService(
        IConfiguration configuration,
        ILogger<FilesService> logger,
        IHubContext<FileHub> hubContext,
        IBackgroundTaskService backgroundTaskService
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _logger = logger;
        _hubContext = hubContext;
        _backgroundTaskService = backgroundTaskService;
        _copyOperations = new ConcurrentDictionary<string, CopyOperationInfo>();
        _copyTaskExecutor = new CopyOperationTaskExecutor(
            _copyOperations,
            _hubContext,
            logger
        );

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
                new FileItem(
                    dirInfo.Name,
                    null,
                    relativePath,
                    null,
                    dirInfo.LastWriteTimeUtc,
                    FileItemType.Directory
                )
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
                    FileHelper.IsMediaFile(file) ? FileItemType.Media : FileItemType.Other
                )
            );
        }

        return files
            .OrderBy(f => f.Type == FileItemType.Directory ? 0 : 1)
            .ThenBy(f => f.Name)
            .ToArray();
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

        var operationGuid = Guid.NewGuid();
        var operationId = operationGuid.ToString();
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
            CopiedFiles: 0,
            SpeedBytesPerSecond: 0,
            EstimatedTimeSeconds: null
        );

        _copyOperations.TryAdd(operationId, copyOperation);

        if (isDirectory)
        {
            _backgroundTaskService.Enqueue(
                CopyTaskName,
                context => _copyTaskExecutor.ExecuteDirectoryCopyAsync(
                    context,
                    operationId,
                    sourceFullPath,
                    destinationFullPath
                ),
                operationGuid
            );
        }
        else
        {
            _backgroundTaskService.Enqueue(
                CopyTaskName,
                context => _copyTaskExecutor.ExecuteFileCopyAsync(
                    context,
                    operationId,
                    sourceFullPath,
                    destinationFullPath,
                    totalBytes
                ),
                operationGuid
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
        if (!Guid.TryParse(operationId, out var taskId))
        {
            return false;
        }

        var cancelled = _backgroundTaskService.TryCancel(taskId);
        if (!cancelled)
        {
            return false;
        }

        if (_copyOperations.TryGetValue(operationId, out var operation))
        {
            if (operation.State == CopyOperationState.Running)
            {
                var cancelledOperation = operation with
                {
                    State = CopyOperationState.Cancelled,
                    CompletedTime = DateTime.UtcNow,
                };
                _copyOperations.TryUpdate(operationId, cancelledOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", cancelledOperation);

                _ = Task.Run(async () =>
                {
                    await Task.Delay(3000);
                    _copyOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("CopyOperationDeleted", operationId);
                });
            }
        }

        return true;
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
        foreach (var operationId in _copyOperations.Keys)
        {
            if (Guid.TryParse(operationId, out var taskId))
            {
                _backgroundTaskService.TryCancel(taskId);
            }
        }
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
