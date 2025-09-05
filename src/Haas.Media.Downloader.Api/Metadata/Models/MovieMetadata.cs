using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Haas.Media.Downloader.Api.Metadata;

public class MovieMetadata
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
    public DateTime? ReleaseDate { get; set; }
    public required string[] Genres { get; set; }
    public required CrewMember[] Crew { get; set; }
    public required CastMember[] Cast { get; set; }
    
    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
    
    // Library and file relation if movie file exists in library
    public string? LibraryId { get; set; }
    public string? FilePath { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

