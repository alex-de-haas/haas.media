namespace Haas.Media.Downloader.Api.Authentication;

public record UpdateProfileRequest(string Email, string? Nickname, string PreferredMetadataLanguage);
