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
    string? ErrorMessage = null
);

public enum CopyOperationState
{
    Running,
    Completed,
    Failed,
    Cancelled
}
