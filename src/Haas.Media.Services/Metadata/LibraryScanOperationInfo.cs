namespace Haas.Media.Services.Metadata;

public record LibraryScanOperationInfo(
    string Id,
    string LibraryPath,
    string LibraryTitle,
    DateTime StartTime,
    string Stage = "Initializing",
    string? CurrentFile = null,
    string? CurrentTitle = null,
    int TotalFiles = 0,
    int ProcessedFiles = 0,
    int FoundMetadata = 0,
    int TotalItems = 0,
    int ProcessedItems = 0,
    int TotalMovies = 0,
    int ProcessedMovies = 0,
    int TotalTvShows = 0,
    int ProcessedTvShows = 0,
    int TotalPeople = 0,
    int SyncedPeople = 0,
    int FailedPeople = 0,
    string? LastError = null
);
