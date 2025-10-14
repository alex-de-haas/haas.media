namespace Haas.Media.Downloader.Api.Authentication;

/// <summary>
/// Represents a user in the local authentication system.
/// </summary>
public class User
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public required string Username { get; set; }
    public required string PasswordHash { get; set; }
    public bool IsAdmin { get; set; }
    public string PreferredMetadataLanguage { get; set; } = "en";
    public string CountryCode { get; set; } = "US";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
