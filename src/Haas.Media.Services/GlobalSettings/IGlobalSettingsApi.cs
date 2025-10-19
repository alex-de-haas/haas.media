namespace Haas.Media.Services.GlobalSettings;

public interface IGlobalSettingsApi
{
    /// <summary>
    /// Gets the global application settings.
    /// Creates default settings if none exist.
    /// </summary>
    Task<GlobalSettings> GetSettingsAsync();

    /// <summary>
    /// Updates the global application settings.
    /// </summary>
    Task<GlobalSettings> UpdateSettingsAsync(UpdateGlobalSettingsRequest request);
}

public record UpdateGlobalSettingsRequest(
    string PreferredMetadataLanguage,
    string CountryCode
);
