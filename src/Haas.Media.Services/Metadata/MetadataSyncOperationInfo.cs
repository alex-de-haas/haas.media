namespace Haas.Media.Services.Metadata;

public record MetadataSyncOperationInfo(
    string Id,
    DateTime StartTime,
    string Stage,
    string? CurrentItem = null,
    int TotalNewFiles = 0,
    int ProcessedNewFiles = 0,
    int TotalMovies = 0,
    int ProcessedMovies = 0,
    int TotalTvShows = 0,
    int ProcessedTvShows = 0,
    int TotalPeople = 0,
    int ProcessedPeople = 0,
    int SyncedPeople = 0,
    int FailedPeople = 0,
    string? LastError = null,
    DateTime? CompletedAt = null
);
