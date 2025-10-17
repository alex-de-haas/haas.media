using System;
using Haas.Media.Services.Authentication;
using LiteDB;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Haas.Media.Services.Metadata.Tmdb;

internal sealed class TmdbCountryProvider : ITmdbCountryProvider
{
    private readonly ILiteCollection<User> _users;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TmdbCountryProvider> _logger;

    public TmdbCountryProvider(
        LiteDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger<TmdbCountryProvider> logger
    )
    {
        _users = database.GetCollection<User>("users");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public string GetPreferredCountryCode()
    {
        var username = _httpContextAccessor.HttpContext?.User?.Identity?.Name;

        if (!string.IsNullOrWhiteSpace(username))
        {
            var user = _users.FindOne(u => u.Username == username);
            var countryCode = NormalizeCountryCode(user?.CountryCode);
            if (countryCode is not null)
            {
                return countryCode;
            }
        }

        try
        {
            var fallbackUser = _users
                .Query()
                .Where(u => !string.IsNullOrWhiteSpace(u.CountryCode))
                .FirstOrDefault();

            var fallbackCountry = NormalizeCountryCode(fallbackUser?.CountryCode);
            if (fallbackCountry is not null)
            {
                return fallbackCountry;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to resolve preferred country code from user profiles");
        }

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
