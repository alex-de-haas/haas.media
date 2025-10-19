using Haas.Media.Services.GlobalSettings;
using LiteDB;

namespace Haas.Media.Services.Metadata;

internal sealed class TmdbLanguageProvider : ITmdbLanguageProvider
{
    private readonly ILiteCollection<GlobalSettings.GlobalSettings> _globalSettings;
    private readonly ILogger<TmdbLanguageProvider> _logger;

    public TmdbLanguageProvider(LiteDatabase database, ILogger<TmdbLanguageProvider> logger)
    {
        _globalSettings = database.GetCollection<GlobalSettings.GlobalSettings>("globalSettings");
        _logger = logger;
    }

    public string GetPreferredLanguage()
    {
        // Get from global settings
        try
        {
            var globalSettings = _globalSettings.FindById(1);
            var globalLanguage = NormalizeLanguage(globalSettings?.PreferredMetadataLanguage);
            if (globalLanguage is not null)
            {
                _logger.LogDebug("Using global preferred language: {Language}", globalLanguage);
                return globalLanguage;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to resolve preferred language from global settings");
        }

        // Default to English
        _logger.LogDebug("No language preference configured, defaulting to English");
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
