namespace Haas.Media.Downloader.Api.Metadata;

public record ScanOperationInfo(
    string Id,
    string LibraryPath,
    string LibraryTitle,
    int TotalFiles,
    int ProcessedFiles,
    int FoundMetadata,
    DateTime StartTime,
    string? CurrentFile = null,
    double? SpeedFilesPerSecond = null,
    double? EstimatedTimeSeconds = null
);
