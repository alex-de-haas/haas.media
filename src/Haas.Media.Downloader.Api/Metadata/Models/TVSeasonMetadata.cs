using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required string PosterPath { get; set; }
    public TVEpisodeMetadata[] Episodes { get; set; } = [];
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
static partial class TVSeasonMetadataMapper
{
    [MapperIgnoreTarget(nameof(TVSeasonMetadata.Episodes))]
    public static partial TVSeasonMetadata Create(this TvSeason tvSeason);
}