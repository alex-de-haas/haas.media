using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;
using TMDbLib.Objects.Search;

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
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public TVSeasonMetadata[] Seasons { get; set; } = [];

    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // Library relation if tv show exists in library
    public string? LibraryId { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class TVShowMetadataMapper
{
    [MapProperty(nameof(TvShow.Id), nameof(TVShowMetadata.TmdbId))]
    [MapProperty(nameof(TvShow.OriginalName), nameof(TVShowMetadata.OriginalTitle))]
    [MapProperty(nameof(TvShow.Name), nameof(TVShowMetadata.Title))]
    [MapperIgnoreSource(nameof(TvShow.AccountStates))]
    [MapperIgnoreSource(nameof(TvShow.Adult))]
    [MapperIgnoreSource(nameof(TvShow.AggregateCredits))]
    [MapperIgnoreSource(nameof(TvShow.AlternativeTitles))]
    [MapperIgnoreSource(nameof(TvShow.Changes))]
    [MapperIgnoreSource(nameof(TvShow.ContentRatings))]
    [MapperIgnoreSource(nameof(TvShow.CreatedBy))]
    [MapperIgnoreSource(nameof(TvShow.Credits))]
    [MapperIgnoreSource(nameof(TvShow.EpisodeGroups))]
    [MapperIgnoreSource(nameof(TvShow.EpisodeRunTime))]
    [MapperIgnoreSource(nameof(TvShow.ExternalIds))]
    [MapperIgnoreSource(nameof(TvShow.FirstAirDate))]
    [MapperIgnoreSource(nameof(TvShow.GenreIds))]
    [MapperIgnoreSource(nameof(TvShow.Homepage))]
    [MapperIgnoreSource(nameof(TvShow.Images))]
    [MapperIgnoreSource(nameof(TvShow.InProduction))]
    [MapperIgnoreSource(nameof(TvShow.Keywords))]
    [MapperIgnoreSource(nameof(TvShow.Languages))]
    [MapperIgnoreSource(nameof(TvShow.LastAirDate))]
    [MapperIgnoreSource(nameof(TvShow.LastEpisodeToAir))]
    [MapperIgnoreSource(nameof(TvShow.Networks))]
    [MapperIgnoreSource(nameof(TvShow.NextEpisodeToAir))]
    [MapperIgnoreSource(nameof(TvShow.NumberOfEpisodes))]
    [MapperIgnoreSource(nameof(TvShow.NumberOfSeasons))]
    [MapperIgnoreSource(nameof(TvShow.OriginCountry))]
    [MapperIgnoreSource(nameof(TvShow.Popularity))]
    [MapperIgnoreSource(nameof(TvShow.ProductionCompanies))]
    [MapperIgnoreSource(nameof(TvShow.ProductionCountries))]
    [MapperIgnoreSource(nameof(TvShow.Recommendations))]
    [MapperIgnoreSource(nameof(TvShow.Reviews))]
    [MapperIgnoreSource(nameof(TvShow.Seasons))]
    [MapperIgnoreSource(nameof(TvShow.Similar))]
    [MapperIgnoreSource(nameof(TvShow.SpokenLanguages))]
    [MapperIgnoreSource(nameof(TvShow.Status))]
    [MapperIgnoreSource(nameof(TvShow.Tagline))]
    [MapperIgnoreSource(nameof(TvShow.Translations))]
    [MapperIgnoreSource(nameof(TvShow.Type))]
    [MapperIgnoreSource(nameof(TvShow.Videos))]
    [MapperIgnoreSource(nameof(TvShow.WatchProviders))]
    public static partial TVShowMetadata Create(this TvShow tvShow, string id);
}

