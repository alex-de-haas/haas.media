using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public TVEpisodeMetadata[] Episodes { get; set; } = [];

    // TMDB image path
    public string? PosterPath { get; set; }
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class TVSeasonMetadataMapper
{
    [MapperIgnoreSource(nameof(TvSeason.AccountStates))]
    [MapperIgnoreSource(nameof(TvSeason.AirDate))]
    [MapperIgnoreSource(nameof(TvSeason.Credits))]
    [MapperIgnoreSource(nameof(TvSeason.Episodes))]
    [MapperIgnoreSource(nameof(TvSeason.ExternalIds))]
    [MapperIgnoreSource(nameof(TvSeason.Id))]
    [MapperIgnoreSource(nameof(TvSeason.Images))]
    [MapperIgnoreSource(nameof(TvSeason.Name))]
    [MapperIgnoreSource(nameof(TvSeason.Translations))]
    [MapperIgnoreSource(nameof(TvSeason.Videos))]
    public static partial TVSeasonMetadata Create(this TvSeason tvSeason);
}

