namespace Haas.Media.Services.Authentication;

public record UpdatePasswordRequest(string CurrentPassword, string NewPassword);
