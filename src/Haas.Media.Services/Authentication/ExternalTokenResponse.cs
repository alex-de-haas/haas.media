namespace Haas.Media.Services.Authentication;

public record ExternalTokenResponse(string Id, string Name, string Token, DateTime CreatedAt);
