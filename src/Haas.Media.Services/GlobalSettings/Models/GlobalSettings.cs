using LiteDB;

namespace Haas.Media.Services.GlobalSettings;

public class GlobalSettings
{
    [BsonId]
    public int Id { get; set; } = 1; // Singleton - always ID 1

    /// <summary>
    /// Preferred metadata language (ISO 639-1 code, e.g., "en", "de", "fr").
    /// Used as fallback when library does not specify a language.
    /// </summary>
    public required string PreferredMetadataLanguage { get; set; } = "en";

    /// <summary>
    /// Preferred release country (ISO 3166-1 alpha-2 code, e.g., "US", "GB", "DE").
    /// Used as fallback when library does not specify a country.
    /// </summary>
    public required string CountryCode { get; set; } = "US";

    /// <summary>
    /// List of directories to scan for movies.
    /// Each path should be absolute and accessible.
    /// </summary>
    public List<string> MovieDirectories { get; set; } = new();

    /// <summary>
    /// List of directories to scan for TV shows.
    /// Each path should be absolute and accessible.
    /// </summary>
    public List<string> TvShowDirectories { get; set; } = new();

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
