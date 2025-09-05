using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Downloader.Api.Metadata;

public class CreateLibraryRequest
{
    [Required]
    public LibraryType Type { get; set; }
    
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
}

public class UpdateLibraryRequest
{
    [Required]
    public LibraryType Type { get; set; }
    
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
}

public class AddToLibraryRequest
{
    [Required]
    public required LibraryType Type { get; set; }
    
    [Required]
    public required string LibraryId { get; set; }
    
    [Required]
    public required string TmdbId { get; set; }
}

public class SearchResult
{
    public required string Title { get; set; }
    public required string OriginalTitle { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
}
