namespace Haas.Media.Downloader.Api.Metadata;

public record ScanOperationInfo(
    string Id,
    string LibraryPath,
    string LibraryTitle,
    DateTime StartTime,
    string? CurrentFile = null,
    int TotalFiles = 0,
    int ProcessedFiles = 0,
    int FoundMetadata = 0,
    int TotalPeople = 0,
    int SyncedPeople = 0,
    int FailedPeople = 0
);
