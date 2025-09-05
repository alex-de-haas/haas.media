namespace Haas.Media.Downloader.Api.Metadata;

public class SearchResult
{
    public required int TmdbId { get; set; }
    public required string Title { get; set; }
    public required string OriginalTitle { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required LibraryType Type { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
}

