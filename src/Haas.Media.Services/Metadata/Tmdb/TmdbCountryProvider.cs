using LiteDB;

namespace Haas.Media.Services.Metadata.Tmdb;

internal sealed class TmdbCountryProvider : ITmdbCountryProvider
{
    private readonly ILiteCollection<LibraryInfo> _libraries;
    private readonly ILogger<TmdbCountryProvider> _logger;

    public TmdbCountryProvider(
        LiteDatabase database,
        ILogger<TmdbCountryProvider> logger
    )
    {
        _libraries = database.GetCollection<LibraryInfo>("libraries");
        _logger = logger;
    }

    public string GetPreferredCountryCode(string? libraryId = null)
    {
        // Check library settings (required parameter for operations that need it)
        if (!string.IsNullOrWhiteSpace(libraryId))
        {
            try
            {
                var library = _libraries.FindById(libraryId);
                var libraryCountryCode = NormalizeCountryCode(library?.CountryCode);
                if (libraryCountryCode is not null)
                {
                    _logger.LogDebug("Using library-specific country code: {CountryCode} for library {LibraryId}", libraryCountryCode, libraryId);
                    return libraryCountryCode;
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Failed to resolve preferred country code from library {LibraryId}", libraryId);
            }
        }

        // Default to US for operations without library context (e.g., global search)
        _logger.LogDebug("No library context provided, defaulting to US");
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
