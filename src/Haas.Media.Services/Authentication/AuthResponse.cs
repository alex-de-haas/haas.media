namespace Haas.Media.Services.Authentication;

public record AuthResponse(
	string Token,
	string Username
);
