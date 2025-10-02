using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Files;

public enum CopyOperationTaskKind
{
    File,
    Directory,
}

public sealed class CopyOperationTask : BackgroundTaskBase
{
    public CopyOperationTask(
        CopyOperationTaskKind kind,
        string sourcePath,
        string destinationPath,
        string sourceFullPath,
        string destinationFullPath,
        long totalBytes,
        int totalFiles,
        bool isDirectory,
        string displayName,
        Guid? id = null
    )
        : base(id)
    {
        Kind = kind;
        SourcePath = sourcePath;
        DestinationPath = destinationPath;
        SourceFullPath = sourceFullPath;
        DestinationFullPath = destinationFullPath;
        TotalBytes = totalBytes;
        TotalFiles = totalFiles;
        IsDirectory = isDirectory;
        DisplayNameOverride = displayName;
    }

    private string DisplayNameOverride { get; }

    public override string Name => DisplayNameOverride;

    public CopyOperationTaskKind Kind { get; }

    public string SourcePath { get; }

    public string DestinationPath { get; }

    public string SourceFullPath { get; }

    public string DestinationFullPath { get; }

    public long TotalBytes { get; }

    public int TotalFiles { get; }

    public bool IsDirectory { get; }
}
