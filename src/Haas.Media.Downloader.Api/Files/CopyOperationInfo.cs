namespace Haas.Media.Downloader.Api.Files;

public record CopyOperationInfo(
    string Id,
    string SourcePath,
    string DestinationPath,
    long TotalBytes,
    long CopiedBytes,
    double Progress,
    CopyOperationState State,
    DateTime StartTime,
    DateTime? CompletedTime = null,
    string? ErrorMessage = null,
    bool IsDirectory = false,
    int TotalFiles = 0,
    int CopiedFiles = 0
);

public enum CopyOperationState
{
    Running,
    Completed,
    Failed,
    Cancelled
}
