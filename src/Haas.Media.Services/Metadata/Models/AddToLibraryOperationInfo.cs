namespace Haas.Media.Services.Metadata;

public record AddToLibraryOperationInfo(
    int Id,
    LibraryType LibraryType,
    string Stage,
    DateTime StartTime,
    string? Title = null,
    string? PosterPath = null,
    DateTime? CompletedTime = null,
    int? TotalSeasons = null,
    int? ProcessedSeasons = null,
    int? TotalEpisodes = null,
    int? ProcessedEpisodes = null,
    string? LastError = null,
    int TotalPeople = 0,
    int SyncedPeople = 0,
    int FailedPeople = 0
);
