namespace Haas.Media.Services.Metadata;

public class SearchResult
{
    public required int Id { get; set; }
    public required string Title { get; set; }
    public required string OriginalTitle { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required LibraryType Type { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public required string OriginalLanguage { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
    public string? LogoPath { get; set; }
}
