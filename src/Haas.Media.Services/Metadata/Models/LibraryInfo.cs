using LiteDB;

namespace Haas.Media.Services.Metadata;

public class LibraryInfo
{
    [BsonId]
    public string? Id { get; set; }
    
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; } // Path to directory with media files
    public required string Title { get; set; }
    public string? Description { get; set; }
    
    /// <summary>
    /// Preferred metadata language for this library (ISO 639-1 code, e.g., "en", "de", "fr").
    /// </summary>
    public required string PreferredMetadataLanguage { get; set; }
    
    /// <summary>
    /// Preferred release country for this library (ISO 3166-1 alpha-2 code, e.g., "US", "GB", "DE").
    /// </summary>
    public required string CountryCode { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
