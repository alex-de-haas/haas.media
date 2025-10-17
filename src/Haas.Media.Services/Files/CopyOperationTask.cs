using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Files;

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
        bool isDirectory
    )
        : base()
    {
        Kind = kind;
        SourcePath = sourcePath;
        DestinationPath = destinationPath;
        SourceFullPath = sourceFullPath;
        DestinationFullPath = destinationFullPath;
        IsDirectory = isDirectory;
    }

    public override string Name => "File copy operation";

    public CopyOperationTaskKind Kind { get; }

    public string SourcePath { get; }

    public string DestinationPath { get; }

    public string SourceFullPath { get; }

    public string DestinationFullPath { get; }

    public bool IsDirectory { get; }
}
