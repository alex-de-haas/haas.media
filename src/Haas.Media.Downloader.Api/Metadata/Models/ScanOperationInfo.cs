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
    int TotalPeople = 0,
    int SyncedPeople = 0,
    int FailedPeople = 0
);
