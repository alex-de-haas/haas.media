namespace Haas.Media.Downloader.Api.Files;

public record CopyOperationInfo(
    string Id,
    string SourcePath,
    string DestinationPath,
    long TotalBytes,
    long CopiedBytes,
    DateTime StartTime,
    DateTime? CompletedTime = null,
    bool IsDirectory = false,
    int TotalFiles = 0,
    int CopiedFiles = 0,
    double? SpeedBytesPerSecond = null,
    double? EstimatedTimeSeconds = null,
    string? CurrentPath = null
);
