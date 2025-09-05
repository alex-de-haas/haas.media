using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Downloader.Api.Metadata;

public class AddToLibraryRequest
{
    [Required]
    public required LibraryType Type { get; set; }
    
    [Required]
    public required string LibraryId { get; set; }
    
    [Required]
    public required string TmdbId { get; set; }
}

