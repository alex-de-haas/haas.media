namespace Haas.Media.Downloader.Api.Metadata;

public record AddToLibraryOperationInfo(
    int Id,
    string LibraryId,
    LibraryType LibraryType,
    string? LibraryTitle,
    string Stage,
    DateTime StartTime,
    string? Title = null,
    string? PosterPath = null,
    DateTime? CompletedTime = null,
    int? TotalSeasons = null,
    int? ProcessedSeasons = null,
    int? TotalEpisodes = null,
    int? ProcessedEpisodes = null
);
