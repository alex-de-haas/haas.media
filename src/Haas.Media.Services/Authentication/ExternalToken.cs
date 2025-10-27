namespace Haas.Media.Services.Authentication;

/// <summary>
/// Represents an external API token (no expiration) used for node-to-node communication and API integrations.
/// </summary>
public class ExternalToken
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public required string Name { get; set; }
    public required string Token { get; set; }
    public required string UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUsedAt { get; set; }
}
