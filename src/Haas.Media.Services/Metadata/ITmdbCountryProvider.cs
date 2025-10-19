namespace Haas.Media.Services.Metadata;

public interface ITmdbCountryProvider
{
    /// <summary>
    /// Gets the preferred country code for metadata from global settings.
    /// </summary>
    /// <returns>ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE").</returns>
    string GetPreferredCountryCode();
}
