using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Haas.Media.Downloader.Api.Metadata;

public class TVShowMetadata
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required TVSeasonMetadata[] Seasons { get; set; }

    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    public required string LibraryId { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required TVEpisodeMetadata[] Episodes { get; set; }

    public required string DirectoryPath { get; set; }
}

public class TVEpisodeMetadata
{
    public required int SeasonNumber { get; set; }
    public required int EpisodeNumber { get; set; }
    public required string Name { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    
    public required string FilePath { get; set; }
}
