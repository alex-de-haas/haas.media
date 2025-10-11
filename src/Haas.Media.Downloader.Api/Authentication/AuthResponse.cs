namespace Haas.Media.Downloader.Api.Authentication;

public record AuthResponse(
	string Token,
	string Username,
	string Email,
	string? Nickname,
	string PreferredMetadataLanguage
);
