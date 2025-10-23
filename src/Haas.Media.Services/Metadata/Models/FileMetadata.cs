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
    /// The library that owns this media file.
    /// </summary>
    public required string LibraryId { get; set; }

    /// <summary>
    /// The TMDb ID of the associated media (Movie ID or TV Show ID).
    /// For movies: the MovieMetadata.Id
    /// For TV shows: the TVShowMetadata.Id
    /// </summary>
    public required int MediaId { get; init; }

    /// <summary>
    /// The media type this file is associated with.
    /// </summary>
    public required LibraryType MediaType { get; init; }

    /// <summary>
    /// Relative path to the media file (relative to DATA_DIRECTORY).
    /// </summary>
    public required string FilePath { get; init; }

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
