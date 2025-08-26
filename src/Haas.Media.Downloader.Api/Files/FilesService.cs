namespace Haas.Media.Downloader.Api.Files;

public class FilesService : IFilesApi, IHostedService
{
    private readonly string _rootPath;
    private readonly ILogger<FilesService> _logger;

    public FilesService(IConfiguration configuration, ILogger<FilesService> logger)
    {
        _logger = logger;

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

    public async Task CopyFileAsync(string sourcePath, string destinationPath)
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
            using var sourceStream = new FileStream(sourceFullPath, FileMode.Open, FileAccess.Read);
            using var destinationStream = new FileStream(
                destinationFullPath,
                FileMode.CreateNew,
                FileAccess.Write
            );
            await sourceStream.CopyToAsync(destinationStream);

            _logger.LogInformation(
                "File copied from {Source} to {Destination}",
                sourcePath,
                destinationPath
            );
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
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Files service is stopping");
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
