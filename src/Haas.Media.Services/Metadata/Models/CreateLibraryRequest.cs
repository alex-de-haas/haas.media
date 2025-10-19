using System.ComponentModel.DataAnnotations;

namespace Haas.Media.Services.Metadata;

public class CreateLibraryRequest
{
    [Required]
    public LibraryType Type { get; set; }
    
    [Required]
    public required string DirectoryPath { get; set; }
    
    [Required]
    public required string Title { get; set; }
    
    public string? Description { get; set; }
    
    /// <summary>
    /// Preferred metadata language for this library (ISO 639-1 code).
    /// </summary>
    [Required]
    public required string PreferredMetadataLanguage { get; set; }
    
    /// <summary>
    /// Preferred release country for this library (ISO 3166-1 alpha-2 code).
    /// </summary>
    [Required]
    public required string CountryCode { get; set; }
}

