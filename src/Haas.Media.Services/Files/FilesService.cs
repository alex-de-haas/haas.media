using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Core.Helpers;

namespace Haas.Media.Services.Files;

public class FilesService : IFilesApi
{
    private readonly string _dataPath;
    private readonly ILogger<FilesService> _logger;
    private readonly IBackgroundTaskManager _backgroundTaskManager;

    public FilesService(
        IConfiguration configuration,
        ILogger<FilesService> logger,
        IBackgroundTaskManager backgroundTaskManager
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _logger = logger;
        _backgroundTaskManager = backgroundTaskManager;

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

    public Task<string> StartCopyAsync(string sourcePath, string destinationPath)
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

        

        var copyTask = new CopyOperationTask(
            isDirectory ? CopyOperationTaskKind.Directory : CopyOperationTaskKind.File,
            sourcePath,
            destinationPath,
            sourceFullPath,
            destinationFullPath,
            isDirectory
        );

        _backgroundTaskManager.RunTask<CopyOperationTask, CopyOperationInfo>(copyTask);

        return Task.FromResult(copyTask.Id.ToString());
    }

    public async Task<FileUploadResult> UploadAsync(
        string? directoryPath,
        IFormFileCollection files,
        bool overwriteExisting = false
    )
    {
        if (files is null || files.Count == 0)
        {
            return FileUploadResult.None;
        }

        var targetDirectory = GetValidatedDirectoryPath(directoryPath);
        Directory.CreateDirectory(targetDirectory);

        var uploaded = 0;
        var skipped = 0;
        var errors = new List<string>();

        foreach (var formFile in files)
        {
            if (formFile is null)
            {
                continue;
            }

            var originalName = formFile.FileName ?? string.Empty;
            var sanitizedName = Path.GetFileName(originalName);

            if (string.IsNullOrWhiteSpace(sanitizedName))
            {
                errors.Add(
                    string.IsNullOrWhiteSpace(originalName)
                        ? "Encountered a file with an empty name."
                        : $"{originalName} has an invalid name."
                );
                continue;
            }

            if (formFile.Length <= 0)
            {
                errors.Add($"{sanitizedName} is empty or unreadable.");
                continue;
            }

            var destinationPath = Path.Combine(targetDirectory, sanitizedName);

            if (!overwriteExisting && File.Exists(destinationPath))
            {
                skipped++;
                continue;
            }

            try
            {
                var fileMode = overwriteExisting ? FileMode.Create : FileMode.CreateNew;

                await using var destinationStream = new FileStream(
                    destinationPath,
                    fileMode,
                    FileAccess.Write,
                    FileShare.None
                );
                await formFile.CopyToAsync(destinationStream);
                uploaded++;
            }
            catch (IOException ex) when (!overwriteExisting && File.Exists(destinationPath))
            {
                // Another upload might have created the file in the meantime; treat as skipped
                skipped++;
                _logger.LogDebug(
                    ex,
                    "Skipping upload for existing file {FilePath}",
                    destinationPath
                );
            }
            catch (Exception ex)
            {
                errors.Add($"{sanitizedName}: {ex.Message}");
                _logger.LogError(
                    ex,
                    "Failed to upload file {FilePath} to {TargetDirectory}",
                    sanitizedName,
                    directoryPath ?? "(root)"
                );
            }
        }

        if (uploaded > 0)
        {
            _logger.LogInformation(
                "Uploaded {Uploaded} file(s) (skipped {Skipped}) to {Directory}",
                uploaded,
                skipped,
                directoryPath ?? "(root)"
            );
        }

        return new FileUploadResult(uploaded, skipped, errors);
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

    private string GetValidatedDirectoryPath(string? relativePath)
    {
        if (string.IsNullOrEmpty(relativePath))
        {
            return Path.GetFullPath(_dataPath);
        }

        return GetValidatedFullPath(relativePath);
    }
}
