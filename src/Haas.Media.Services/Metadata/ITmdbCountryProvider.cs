namespace Haas.Media.Services.Metadata;

public interface ITmdbCountryProvider
{
    /// <summary>
    /// Gets the preferred country code for metadata, checking library settings first, then user settings.
    /// </summary>
    /// <param name="libraryId">Optional library ID to check for library-specific country preference.</param>
    /// <returns>ISO 3166-1 alpha-2 country code (e.g., "US", "GB", "DE").</returns>
    string GetPreferredCountryCode(string? libraryId = null);
}
