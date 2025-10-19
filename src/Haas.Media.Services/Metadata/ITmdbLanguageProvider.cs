namespace Haas.Media.Services.Metadata;

public interface ITmdbLanguageProvider
{
    /// <summary>
    /// Gets the preferred language for metadata, checking library settings first, then user settings.
    /// </summary>
    /// <param name="libraryId">Optional library ID to check for library-specific language preference.</param>
    /// <returns>ISO 639-1 language code (e.g., "en", "de", "fr").</returns>
    string GetPreferredLanguage(string libraryId);
}
