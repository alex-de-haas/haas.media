namespace Haas.Media.Services.Authentication;

public record UpdateProfileRequest(
    string? PreferredMetadataLanguage,
    string? CountryCode
);
