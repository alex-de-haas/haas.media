using System;
using Haas.Media.Downloader.Api.Authentication;
using LiteDB;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class TmdbLanguageProvider : ITmdbLanguageProvider
{
    private readonly ILiteCollection<User> _users;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TmdbLanguageProvider> _logger;

    public TmdbLanguageProvider(
        LiteDatabase database,
        IHttpContextAccessor httpContextAccessor,
        ILogger<TmdbLanguageProvider> logger
    )
    {
        _users = database.GetCollection<User>("users");
        _httpContextAccessor = httpContextAccessor;
        _logger = logger;
    }

    public string GetPreferredLanguage()
    {
        var username = _httpContextAccessor.HttpContext?.User?.Identity?.Name;

        if (!string.IsNullOrWhiteSpace(username))
        {
            var user = _users.FindOne(u => u.Username == username);
            var language = NormalizeLanguage(user?.PreferredMetadataLanguage);
            if (language is not null)
            {
                return language;
            }
        }

        try
        {
            var fallbackUser = _users
                .Query()
                .Where(u => !string.IsNullOrWhiteSpace(u.PreferredMetadataLanguage))
                .FirstOrDefault();

            var fallbackLanguage = NormalizeLanguage(fallbackUser?.PreferredMetadataLanguage);
            if (fallbackLanguage is not null)
            {
                return fallbackLanguage;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to resolve preferred TMDb language from user profiles");
        }

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
