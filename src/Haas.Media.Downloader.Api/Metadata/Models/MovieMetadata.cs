using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.Movies;

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
    
    // TMDB image paths
    public required string PosterPath { get; set; }
    public required string BackdropPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    
    // Library and file relation if movie file exists in library
    public string? LibraryId { get; set; }
    public string? FilePath { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
static partial class MovieMetadataMapper
{
    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Genres))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Cast))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Crew))]
    [MapperIgnoreTarget(nameof(MovieMetadata.LibraryId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.FilePath))]
    [MapperIgnoreTarget(nameof(MovieMetadata.CreatedAt))]
    [MapperIgnoreTarget(nameof(MovieMetadata.UpdatedAt))]
    public static partial MovieMetadata Create(this Movie source, string id);

    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    public static partial MovieMetadata Update(this MovieMetadata target, Movie source);
}