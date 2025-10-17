namespace Haas.Media.Services.Authentication;

public record RegisterRequest(
	string Username,
	string Password,
	string? PreferredMetadataLanguage = null,
	string? CountryCode = null
);
