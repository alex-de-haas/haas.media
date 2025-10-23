using LiteDB;

namespace Haas.Media.Services.Metadata;

/// <summary>
/// Stores playback information for a specific file and user.
/// </summary>
public class FilePlaybackInfo
{
    /// <summary>
    /// Unique identifier for this playback record.
    /// Format: {UserId}_{FileMetadataId}
    /// </summary>
    [BsonId]
    public required string Id { get; set; }

    /// <summary>
    /// The user ID who owns this playback state.
    /// </summary>
    public required string UserId { get; set; }

    /// <summary>
    /// The FileMetadata ID this playback info is for.
    /// </summary>
    public required string FileMetadataId { get; set; }

    /// <summary>
    /// Current playback position in ticks (100 nanoseconds).
    /// Compatible with Jellyfin's tick system.
    /// </summary>
    public long PlaybackPositionTicks { get; set; } = 0;

    /// <summary>
    /// Number of times this file has been played.
    /// </summary>
    public int PlayCount { get; set; } = 0;

    /// <summary>
    /// Whether this file has been marked as played/watched.
    /// </summary>
    public bool Played { get; set; } = false;

    /// <summary>
    /// Date and time when this file was last played.
    /// </summary>
    public DateTime? LastPlayedDate { get; set; }

    /// <summary>
    /// Whether this file is marked as a favorite.
    /// </summary>
    public bool IsFavorite { get; set; } = false;

    /// <summary>
    /// Date and time when this record was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Date and time when this record was last updated.
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Creates a unique ID for a playback info record.
    /// </summary>
    public static string CreateId(string userId, string fileMetadataId) =>
        $"{userId}_{fileMetadataId}";
}
