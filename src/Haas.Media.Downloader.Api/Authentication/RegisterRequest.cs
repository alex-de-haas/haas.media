namespace Haas.Media.Downloader.Api.Authentication;

public record RegisterRequest(
	string Username,
	string Password,
	string? PreferredMetadataLanguage = null
);
