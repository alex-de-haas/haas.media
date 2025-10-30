namespace Haas.Media.Services.Authentication;

/// <summary>
/// Public information about an external token (including the actual token value).
/// </summary>
public record ExternalTokenInfo(
    string Id,
    string Name,
    string Token,
    DateTime CreatedAt,
    DateTime? LastUsedAt
);
