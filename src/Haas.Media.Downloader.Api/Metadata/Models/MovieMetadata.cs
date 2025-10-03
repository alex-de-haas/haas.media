using LiteDB;
using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.Movies;

namespace Haas.Media.Downloader.Api.Metadata;

public class MovieMetadata
{
    [BsonId]
    public string? Id { get; set; }
    
    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public DateTime? DigitalReleaseDate { get; set; }
    public long Budget { get; set; }
    public long Revenue { get; set; }
    
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
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
static partial class MovieMetadataMapper
{
    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Genres))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Cast))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Crew))]
    [MapperIgnoreTarget(nameof(MovieMetadata.DigitalReleaseDate))]
    [MapperIgnoreTarget(nameof(MovieMetadata.LibraryId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.FilePath))]
    [MapperIgnoreTarget(nameof(MovieMetadata.CreatedAt))]
    [MapperIgnoreTarget(nameof(MovieMetadata.UpdatedAt))]
    public static partial MovieMetadata Create(this Movie source, string id);

    [MapperIgnoreTarget(nameof(MovieMetadata.Id))]
    [MapperIgnoreTarget(nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Genres))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Cast))]
    [MapperIgnoreTarget(nameof(MovieMetadata.Crew))]
    [MapperIgnoreTarget(nameof(MovieMetadata.DigitalReleaseDate))]
    [MapperIgnoreTarget(nameof(MovieMetadata.LibraryId))]
    [MapperIgnoreTarget(nameof(MovieMetadata.FilePath))]
    [MapperIgnoreTarget(nameof(MovieMetadata.CreatedAt))]
    [MapperIgnoreTarget(nameof(MovieMetadata.UpdatedAt))]
    public static partial void Update(this Movie source, MovieMetadata target);
}
