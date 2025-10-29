using LiteDB;

namespace Haas.Media.Services.GlobalSettings;

internal sealed class GlobalSettingsService : IGlobalSettingsApi
{
    private readonly ILiteCollection<GlobalSettings> _settings;
    private readonly ILogger<GlobalSettingsService> _logger;

    public GlobalSettingsService(LiteDatabase database, ILogger<GlobalSettingsService> logger)
    {
        _settings = database.GetCollection<GlobalSettings>("globalSettings");
        _logger = logger;
    }

    public Task<GlobalSettings> GetSettingsAsync()
    {
        var settings = _settings.FindById(1);
        if (settings is null)
        {
            // Create default settings
            settings = new GlobalSettings
            {
                Id = 1,
                PreferredMetadataLanguage = "en",
                CountryCode = "US",
                MovieDirectories = [],
                TvShowDirectories = [],
                TopCastCount = 20,
                TopCrewCount = 12,
                UpdatedAt = DateTime.UtcNow
            };
            _settings.Insert(settings);
            _logger.LogInformation("Created default global settings");
        }

        return Task.FromResult(settings);
    }

    public Task<GlobalSettings> UpdateSettingsAsync(UpdateGlobalSettingsRequest request)
    {
        var settings = _settings.FindById(1);
        if (settings is null)
        {
            settings = new GlobalSettings
            {
                Id = 1,
                PreferredMetadataLanguage = request.PreferredMetadataLanguage,
                CountryCode = request.CountryCode,
                MovieDirectories = request.MovieDirectories,
                TvShowDirectories = request.TvShowDirectories,
                TopCastCount = request.TopCastCount,
                TopCrewCount = request.TopCrewCount,
                UpdatedAt = DateTime.UtcNow
            };
            _settings.Insert(settings);
            _logger.LogInformation("Created global settings with custom values");
        }
        else
        {
            settings.PreferredMetadataLanguage = request.PreferredMetadataLanguage;
            settings.CountryCode = request.CountryCode;
            settings.MovieDirectories = request.MovieDirectories;
            settings.TvShowDirectories = request.TvShowDirectories;
            settings.TopCastCount = request.TopCastCount;
            settings.TopCrewCount = request.TopCrewCount;
            settings.UpdatedAt = DateTime.UtcNow;
            _settings.Update(settings);
            _logger.LogInformation("Updated global settings");
        }

        return Task.FromResult(settings);
    }
}
