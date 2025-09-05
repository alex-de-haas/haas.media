namespace Haas.Media.Downloader.Api.Metadata;

public record ScanOperationInfo(
    string Id,
    string LibraryPath,
    string LibraryTitle,
    int TotalFiles,
    int ProcessedFiles,
    int FoundMetadata,
    double Progress,
    ScanOperationState State,
    DateTime StartTime,
    DateTime? CompletedTime = null,
    string? ErrorMessage = null,
    string? CurrentFile = null,
    double? SpeedFilesPerSecond = null,
    double? EstimatedTimeSeconds = null
);

public enum ScanOperationState
{
    Running,
    Completed,
    Failed,
    Cancelled
}
