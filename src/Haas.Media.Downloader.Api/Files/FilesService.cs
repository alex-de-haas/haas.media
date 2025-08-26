namespace Haas.Media.Downloader.Api.Files;

public class FilesService : IFilesApi
{
    private readonly string _rootPath;
    private readonly ILogger<FilesService> _logger;

    public FilesService(IConfiguration configuration, ILogger<FilesService> logger)
    {
        _logger = logger;

        // Get root directory from configuration, default to data/files
        _rootPath =
            configuration["FILES_ROOT_PATH"]
            ?? Path.Combine(Environment.CurrentDirectory, "data");

        // Ensure root directory exists
        Directory.CreateDirectory(_rootPath);

        _logger.LogInformation("Files service initialized with root path: {RootPath}", _rootPath);
    }

    public Task<FileItem[]> GetFilesAsync(string? path = null)
    {
        var targetPath = string.IsNullOrEmpty(path) ? _rootPath : Path.Combine(_rootPath, path);

        if (!Directory.Exists(targetPath))
        {
            _logger.LogWarning("Directory not found: {Path}", targetPath);
            return Task.FromResult(Array.Empty<FileItem>());
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

        try
        {
            // Add directories
            foreach (var directory in Directory.GetDirectories(targetPath))
            {
                var dirInfo = new DirectoryInfo(directory);
                var relativePath = Path.GetRelativePath(_rootPath, directory);

                files.Add(
                    new FileItem(
                        dirInfo.Name,
                        null,
                        relativePath,
                        null,
                        dirInfo.LastWriteTimeUtc,
                        true
                    )
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
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting files from path: {Path}", targetPath);
            throw;
        }

        return Task.FromResult(
            files.OrderBy(f => f.IsDirectory ? 0 : 1).ThenBy(f => f.Name).ToArray()
        );
    }

    public Task<FileItem> GetFileInfoAsync(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        if (!File.Exists(fullPath) && !Directory.Exists(fullPath))
        {
            throw new FileNotFoundException($"File or directory not found: {relativePath}");
        }

        if (Directory.Exists(fullPath))
        {
            var dirInfo = new DirectoryInfo(fullPath);
            return Task.FromResult(
                new FileItem(dirInfo.Name, null, relativePath, null, dirInfo.LastWriteTimeUtc, true)
            );
        }
        else
        {
            var fileInfo = new FileInfo(fullPath);
            return Task.FromResult(
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
    }

    public Task CopyFileAsync(string sourcePath, string destinationPath)
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

        try
        {
            File.Copy(sourceFullPath, destinationFullPath, overwrite: false);
            _logger.LogInformation(
                "File copied from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error copying file from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
            throw;
        }
    }

    public Task MoveFileAsync(string sourcePath, string destinationPath)
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

        try
        {
            File.Move(sourceFullPath, destinationFullPath, overwrite: false);
            _logger.LogInformation(
                "File moved from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error moving file from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
            throw;
        }
    }

    public Task DeleteFileAsync(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"File not found: {relativePath}");
        }

        try
        {
            File.Delete(fullPath);
            _logger.LogInformation("File deleted: {Path}", relativePath);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {Path}", relativePath);
            throw;
        }
    }

    public Task DeleteDirectoryAsync(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        if (!Directory.Exists(fullPath))
        {
            throw new DirectoryNotFoundException($"Directory not found: {relativePath}");
        }

        try
        {
            Directory.Delete(fullPath, recursive: true);
            _logger.LogInformation("Directory deleted: {Path}", relativePath);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting directory: {Path}", relativePath);
            throw;
        }
    }

    public Task CreateDirectoryAsync(string relativePath)
    {
        var fullPath = GetValidatedFullPath(relativePath);

        try
        {
            Directory.CreateDirectory(fullPath);
            _logger.LogInformation("Directory created: {Path}", relativePath);
            return Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating directory: {Path}", relativePath);
            throw;
        }
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
