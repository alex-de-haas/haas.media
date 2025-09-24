using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;

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

    // TMDB image paths
    public required string PosterPath { get; set; }
    public required string BackdropPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public Network[] Networks { get; set; } = [];
    public TVSeasonMetadata[] Seasons { get; set; } = [];

    // Library relation if tv show exists in library
    public string? LibraryId { get; set; }

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
static partial class TVShowMetadataMapper
{
    [MapProperty(nameof(TvShow.Id), nameof(TVShowMetadata.TmdbId))]
    [MapProperty(nameof(TvShow.OriginalName), nameof(TVShowMetadata.OriginalTitle))]
    [MapProperty(nameof(TvShow.Name), nameof(TVShowMetadata.Title))]
    [MapperIgnoreTarget(nameof(TVShowMetadata.Genres))]
    [MapperIgnoreTarget(nameof(TVShowMetadata.Cast))]
    [MapperIgnoreTarget(nameof(TVShowMetadata.Crew))]
    [MapperIgnoreTarget(nameof(TVShowMetadata.Networks))]
    [MapperIgnoreTarget(nameof(TVShowMetadata.Seasons))]
    [MapperIgnoreTarget(nameof(MovieMetadata.LibraryId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.CreatedAt))]
    [MapperIgnoreTarget(nameof(MovieMetadata.UpdatedAt))]
    public static partial TVShowMetadata Create(this TvShow tvShow, string id);
}
