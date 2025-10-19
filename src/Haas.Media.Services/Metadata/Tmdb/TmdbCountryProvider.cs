using Haas.Media.Services.GlobalSettings;
using LiteDB;

namespace Haas.Media.Services.Metadata.Tmdb;

internal sealed class TmdbCountryProvider : ITmdbCountryProvider
{
    private readonly ILiteCollection<GlobalSettings.GlobalSettings> _globalSettings;
    private readonly ILogger<TmdbCountryProvider> _logger;

    public TmdbCountryProvider(
        LiteDatabase database,
        ILogger<TmdbCountryProvider> logger
    )
    {
        _globalSettings = database.GetCollection<GlobalSettings.GlobalSettings>("globalSettings");
        _logger = logger;
    }

    public string GetPreferredCountryCode()
    {
        // Get from global settings
        try
        {
            var globalSettings = _globalSettings.FindById(1);
            var globalCountryCode = NormalizeCountryCode(globalSettings?.CountryCode);
            if (globalCountryCode is not null)
            {
                _logger.LogDebug("Using global preferred country code: {CountryCode}", globalCountryCode);
                return globalCountryCode;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to resolve preferred country code from global settings");
        }

        // Default to US
        _logger.LogDebug("No country preference configured, defaulting to US");
        return "US";
    }

    private static string? NormalizeCountryCode(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return null;
        }

        var normalized = countryCode.Trim().ToUpperInvariant();
        if (normalized.Length != 2 || normalized.Any(ch => ch is < 'A' or > 'Z'))
        {
            return null;
        }

        return normalized;
    }
}
