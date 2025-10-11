namespace Haas.Media.Downloader.Api.Authentication;

public record UpdatePasswordRequest(string CurrentPassword, string NewPassword);
