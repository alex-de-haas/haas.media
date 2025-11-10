using LiteDB;

namespace Haas.Media.Services.Metadata;

/// <summary>
/// Represents the association between a media file and its metadata (Movie or TV Show).
/// This allows multiple files to be associated with a single Movie or TV Show.
/// </summary>
public class FileMetadata
{
    /// <summary>
    /// Unique identifier for this file metadata record.
    /// </summary>
    [BsonId]
    public required string Id { get; set; }

    /// <summary>
    /// Optional: The ID of the node where this file is located (null if local).
    /// </summary>
    public string? NodeId { get; set; }

    /// <summary>
    /// The TMDb ID of the associated media (Movie ID or TV Show ID).
    /// </summary>
    public required int TmdbId { get; init; }

    /// <summary>
    /// The media type this file is associated with.
    /// </summary>
    public required LibraryType LibraryType { get; init; }

    /// <summary>
    /// Relative path to the media file (relative to DATA_DIRECTORY).
    /// Note: This is settable to allow updating from node paths to local paths after download.
    /// </summary>
    public required string FilePath { get; set; }

    /// <summary>
    /// MD5 hash of the file content for integrity verification.
    /// Calculated when file is added locally or fetched from nodes.
    /// Used to validate downloaded files from nodes.
    /// </summary>
    public string? Md5Hash { get; set; }

    /// <summary>
    /// For TV show episodes only: season number.
    /// </summary>
    public int? SeasonNumber { get; init; }

    /// <summary>
    /// For TV show episodes only: episode number.
    /// </summary>
    public int? EpisodeNumber { get; init; }

    public required DateTime CreatedAt { get; init; }

    public required DateTime UpdatedAt { get; set; }
}
