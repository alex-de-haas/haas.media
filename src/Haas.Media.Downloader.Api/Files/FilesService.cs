using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;

namespace Haas.Media.Downloader.Api.Files;

public class FilesService : IFilesApi, IHostedService
{
    private readonly string _rootPath;
    private readonly ILogger<FilesService> _logger;
    private readonly IHubContext<FileHub> _hubContext;
    private readonly ConcurrentDictionary<string, CopyOperationInfo> _copyOperations;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens;
    private Timer? _broadcastTimer;

    public FilesService(IConfiguration configuration, ILogger<FilesService> logger, IHubContext<FileHub> hubContext)
    {
        _logger = logger;
        _hubContext = hubContext;
        _copyOperations = new ConcurrentDictionary<string, CopyOperationInfo>();
        _cancellationTokens = new ConcurrentDictionary<string, CancellationTokenSource>();

        // Get root directory from configuration, default to data/files
        _rootPath =
            configuration["FILES_ROOT_PATH"] ?? Path.Combine(Environment.CurrentDirectory, "data");

        // Ensure root directory exists
        Directory.CreateDirectory(_rootPath);

        _logger.LogInformation("Files service initialized with root path: {RootPath}", _rootPath);
    }

    public FileItem[] GetFiles(string? path = null)
    {
        var targetPath = string.IsNullOrEmpty(path) ? _rootPath : Path.Combine(_rootPath, path);

        if (!Directory.Exists(targetPath))
        {
            _logger.LogWarning("Directory not found: {Path}", targetPath);
            return [];
        }

        // Ensure we're not accessing outside the root path
        var fullTargetPath = Path.GetFullPath(targetPath);
        var fullRootPath = Path.GetFullPath(_rootPath);

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
            var relativePath = Path.GetRelativePath(_rootPath, directory);

            files.Add(
                new FileItem(dirInfo.Name, null, relativePath, null, dirInfo.LastWriteTimeUtc, true)
            );
        }

        // Add files
        foreach (var file in Directory.GetFiles(targetPath))
        {
            var fileInfo = new FileInfo(file);
            var relativePath = Path.GetRelativePath(_rootPath, file);

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

    public async Task<string> StartCopyFileAsync(string sourcePath, string destinationPath)
    {
        var sourceFullPath = GetValidatedFullPath(sourcePath);
        var destinationFullPath = GetValidatedFullPath(destinationPath);

        if (!File.Exists(sourceFullPath))
        {
            throw new FileNotFoundException($"Source file not found: {sourcePath}");
        }

        // Create destination directory if it doesn't exist
        var destinationDir = Path.GetDirectoryName(destinationFullPath);
        if (!string.IsNullOrEmpty(destinationDir))
        {
            Directory.CreateDirectory(destinationDir);
        }

        var operationId = Guid.NewGuid().ToString();
        var fileInfo = new FileInfo(sourceFullPath);
        var totalBytes = fileInfo.Length;
        
        var copyOperation = new CopyOperationInfo(
            operationId,
            sourcePath,
            destinationPath,
            totalBytes,
            0,
            0.0,
            CopyOperationState.Running,
            DateTime.UtcNow
        );

        _copyOperations.TryAdd(operationId, copyOperation);
        var cancellationTokenSource = new CancellationTokenSource();
        _cancellationTokens.TryAdd(operationId, cancellationTokenSource);

        // Start the copy operation in the background
        _ = Task.Run(async () => await PerformCopyOperationAsync(operationId, sourceFullPath, destinationFullPath, totalBytes, cancellationTokenSource.Token));

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
                    CompletedTime = DateTime.UtcNow 
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

    private async Task PerformCopyOperationAsync(string operationId, string sourceFullPath, string destinationFullPath, long totalBytes, CancellationToken cancellationToken)
    {
        try
        {
            using var sourceStream = new FileStream(sourceFullPath, FileMode.Open, FileAccess.Read);
            using var destinationStream = new FileStream(destinationFullPath, FileMode.CreateNew, FileAccess.Write);
            
            var buffer = new byte[81920]; // 80KB buffer
            long totalCopied = 0;
            int bytesRead;

            while ((bytesRead = await sourceStream.ReadAsync(buffer, 0, buffer.Length, cancellationToken)) > 0)
            {
                await destinationStream.WriteAsync(buffer, 0, bytesRead, cancellationToken);
                totalCopied += bytesRead;

                var progress = totalBytes > 0 ? (double)totalCopied / totalBytes * 100.0 : 0.0;
                
                if (_copyOperations.TryGetValue(operationId, out var currentOperation))
                {
                    var updatedOperation = currentOperation with 
                    { 
                        CopiedBytes = totalCopied, 
                        Progress = progress 
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
                    CompletedTime = DateTime.UtcNow 
                };
                _copyOperations.TryUpdate(operationId, completedOperation, operation);
                await _hubContext.Clients.All.SendAsync("CopyOperationUpdated", completedOperation);
                
                _logger.LogInformation("File copy completed: {OperationId} from {Source} to {Destination}", 
                    operationId, sourceFullPath, destinationFullPath);

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
            _logger.LogError(ex, "Error copying file: {OperationId} from {Source} to {Destination}", 
                operationId, sourceFullPath, destinationFullPath);
            
            if (_copyOperations.TryGetValue(operationId, out var operation))
            {
                var failedOperation = operation with 
                { 
                    State = CopyOperationState.Failed, 
                    CompletedTime = DateTime.UtcNow,
                    ErrorMessage = ex.Message
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
        var operationsToRemove = _copyOperations.Values
            .Where(op => op.State != CopyOperationState.Running && 
                        op.CompletedTime.HasValue && 
                        op.CompletedTime.Value < cutoffTime)
            .Select(op => op.Id)
            .ToList();

        foreach (var operationId in operationsToRemove)
        {
            _copyOperations.TryRemove(operationId, out _);
        }
    }

    public void MoveFile(string sourcePath, string destinationPath)
    {
        var sourceFullPath = GetValidatedFullPath(sourcePath);
        var destinationFullPath = GetValidatedFullPath(destinationPath);

        if (!File.Exists(sourceFullPath))
        {
            throw new FileNotFoundException($"Source file not found: {sourcePath}");
        }

        // Create destination directory if it doesn't exist
        var destinationDir = Path.GetDirectoryName(destinationFullPath);
        if (!string.IsNullOrEmpty(destinationDir))
        {
            Directory.CreateDirectory(destinationDir);
        }

        File.Move(sourceFullPath, destinationFullPath, overwrite: false);
    }

    public void RenameFile(string relativePath, string newFileName)
    {
        var oldFullPath = GetValidatedFullPath(relativePath);
        var oldFileName = Path.GetFileName(oldFullPath);
        var newFullPath = Path.Combine(Path.GetDirectoryName(oldFullPath)!, newFileName);

        if (!File.Exists(oldFullPath))
        {
            throw new FileNotFoundException($"File not found: {relativePath}");
        }

        File.Move(oldFullPath, newFullPath, overwrite: false);
        _logger.LogInformation(
            "File renamed from {OldName} to {NewName}",
            oldFileName,
            newFileName
        );
    }

    public void DeleteFile(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"File not found: {relativePath}");
        }

        File.Delete(fullPath);
        _logger.LogInformation("File deleted: {Path}", relativePath);
    }

    public void CreateDirectory(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        Directory.CreateDirectory(fullPath);
        _logger.LogInformation("Directory created: {Path}", relativePath);
    }

    public void DeleteDirectory(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        if (!Directory.Exists(fullPath))
        {
            throw new DirectoryNotFoundException($"Directory not found: {relativePath}");
        }

        Directory.Delete(fullPath, recursive: true);
        _logger.LogInformation("Directory deleted: {Path}", relativePath);
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

        var fullPath = Path.Combine(_rootPath, relativePath);
        var resolvedPath = Path.GetFullPath(fullPath);
        var rootPath = Path.GetFullPath(_rootPath);

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
