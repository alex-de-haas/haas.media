using LiteDB;

namespace Haas.Media.Services.Metadata;

internal sealed class TmdbLanguageProvider : ITmdbLanguageProvider
{
    private readonly ILiteCollection<LibraryInfo> _libraries;
    private readonly ILogger<TmdbLanguageProvider> _logger;

    public TmdbLanguageProvider(LiteDatabase database, ILogger<TmdbLanguageProvider> logger)
    {
        _libraries = database.GetCollection<LibraryInfo>("libraries");
        _logger = logger;
    }

    public string GetPreferredLanguage(string libraryId)
    {
        // Check library settings (required parameter for operations that need it)
        try
        {
            var library = _libraries.FindById(libraryId);
            var libraryLanguage = NormalizeLanguage(library?.PreferredMetadataLanguage);
            if (libraryLanguage is not null)
            {
                _logger.LogDebug(
                    "Using library-specific language: {Language} for library {LibraryId}",
                    libraryLanguage,
                    libraryId
                );
                return libraryLanguage;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "Failed to resolve preferred language from library {LibraryId}",
                libraryId
            );
        }

        // Default to English for operations without library context (e.g., global search)
        _logger.LogDebug("No library context provided, defaulting to English");
        return "en";
    }

    private static string? NormalizeLanguage(string? language)
    {
        if (string.IsNullOrWhiteSpace(language))
        {
            return null;
        }

        return language.Trim();
    }
}
