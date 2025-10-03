using System;

namespace Haas.Media.Downloader.Api.Metadata;

public record AddToLibraryOperationInfo(
    string Id,
    string LibraryId,
    LibraryType LibraryType,
    string? LibraryTitle,
    int TmdbId,
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
