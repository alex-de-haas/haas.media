using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;

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

    public string[] Genres { get; set; } = [];

    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    
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

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class MovieMetadataMapper
{
    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreSource(nameof(SearchMovie.Adult))]
    [MapperIgnoreSource(nameof(SearchMovie.Video))]
    [MapperIgnoreSource(nameof(SearchMovie.GenreIds))]
    [MapperIgnoreSource(nameof(SearchMovie.MediaType))]
    [MapperIgnoreSource(nameof(SearchMovie.Popularity))]
    public static partial MovieMetadata Map(this SearchMovie source, string id);

    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreSource(nameof(Movie.AccountStates))]
    [MapperIgnoreSource(nameof(Movie.Adult))]
    [MapperIgnoreSource(nameof(Movie.AlternativeTitles))]
    [MapperIgnoreSource(nameof(Movie.BelongsToCollection))]
    [MapperIgnoreSource(nameof(Movie.Budget))]
    [MapperIgnoreSource(nameof(Movie.Changes))]
    [MapperIgnoreSource(nameof(Movie.Credits))]
    [MapperIgnoreSource(nameof(Movie.Homepage))]
    [MapperIgnoreSource(nameof(Movie.Images))]
    [MapperIgnoreSource(nameof(Movie.ImdbId))]
    [MapperIgnoreSource(nameof(Movie.Keywords))]
    [MapperIgnoreSource(nameof(Movie.Lists))]
    [MapperIgnoreSource(nameof(Movie.Popularity))]
    [MapperIgnoreSource(nameof(Movie.ProductionCompanies))]
    [MapperIgnoreSource(nameof(Movie.ProductionCountries))]
    [MapperIgnoreSource(nameof(Movie.ReleaseDates))]
    [MapperIgnoreSource(nameof(Movie.ExternalIds))]
    [MapperIgnoreSource(nameof(Movie.Releases))]
    [MapperIgnoreSource(nameof(Movie.Revenue))]
    [MapperIgnoreSource(nameof(Movie.Reviews))]
    [MapperIgnoreSource(nameof(Movie.Runtime))]
    [MapperIgnoreSource(nameof(Movie.Similar))]
    [MapperIgnoreSource(nameof(Movie.Recommendations))]
    [MapperIgnoreSource(nameof(Movie.SpokenLanguages))]
    [MapperIgnoreSource(nameof(Movie.Status))]
    [MapperIgnoreSource(nameof(Movie.Tagline))]
    [MapperIgnoreSource(nameof(Movie.Translations))]
    [MapperIgnoreSource(nameof(Movie.Video))]
    [MapperIgnoreSource(nameof(Movie.Videos))]
    [MapperIgnoreSource(nameof(Movie.WatchProviders))]
    public static partial MovieMetadata Create(this Movie source, string id);

    [MapProperty(nameof(Movie.Id), nameof(MovieMetadata.TmdbId))]
    [MapperIgnoreSource(nameof(Movie.AccountStates))]
    [MapperIgnoreSource(nameof(Movie.Adult))]
    [MapperIgnoreSource(nameof(Movie.AlternativeTitles))]
    [MapperIgnoreSource(nameof(Movie.BelongsToCollection))]
    [MapperIgnoreSource(nameof(Movie.Budget))]
    [MapperIgnoreSource(nameof(Movie.Changes))]
    [MapperIgnoreSource(nameof(Movie.Credits))]
    [MapperIgnoreSource(nameof(Movie.Homepage))]
    [MapperIgnoreSource(nameof(Movie.Images))]
    [MapperIgnoreSource(nameof(Movie.ImdbId))]
    [MapperIgnoreSource(nameof(Movie.Keywords))]
    [MapperIgnoreSource(nameof(Movie.Lists))]
    [MapperIgnoreSource(nameof(Movie.Popularity))]
    [MapperIgnoreSource(nameof(Movie.ProductionCompanies))]
    [MapperIgnoreSource(nameof(Movie.ProductionCountries))]
    [MapperIgnoreSource(nameof(Movie.ReleaseDates))]
    [MapperIgnoreSource(nameof(Movie.ExternalIds))]
    [MapperIgnoreSource(nameof(Movie.Releases))]
    [MapperIgnoreSource(nameof(Movie.Revenue))]
    [MapperIgnoreSource(nameof(Movie.Reviews))]
    [MapperIgnoreSource(nameof(Movie.Runtime))]
    [MapperIgnoreSource(nameof(Movie.Similar))]
    [MapperIgnoreSource(nameof(Movie.Recommendations))]
    [MapperIgnoreSource(nameof(Movie.SpokenLanguages))]
    [MapperIgnoreSource(nameof(Movie.Status))]
    [MapperIgnoreSource(nameof(Movie.Tagline))]
    [MapperIgnoreSource(nameof(Movie.Translations))]
    [MapperIgnoreSource(nameof(Movie.Video))]
    [MapperIgnoreSource(nameof(Movie.Videos))]
    [MapperIgnoreSource(nameof(Movie.WatchProviders))]
    public static partial MovieMetadata Update(this MovieMetadata target, Movie source);
}