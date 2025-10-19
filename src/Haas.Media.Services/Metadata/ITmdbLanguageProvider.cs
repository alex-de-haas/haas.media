namespace Haas.Media.Services.Metadata;

public interface ITmdbLanguageProvider
{
    /// <summary>
    /// Gets the preferred language for metadata from global settings.
    /// </summary>
    /// <returns>ISO 639-1 language code (e.g., "en", "de", "fr").</returns>
    string GetPreferredLanguage();
}
