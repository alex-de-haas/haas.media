namespace Haas.Media.Downloader.Api.Metadata;

public record MetadataRefreshOperationInfo(
    string Id,
    int TotalItems,
    int ProcessedItems,
    int TotalMovies,
    int ProcessedMovies,
    int TotalTvShows,
    int ProcessedTvShows,
    string Stage,
    string? CurrentTitle = null,
    DateTime? StartedAt = null,
    DateTime? CompletedAt = null,
    string? LastError = null
);
