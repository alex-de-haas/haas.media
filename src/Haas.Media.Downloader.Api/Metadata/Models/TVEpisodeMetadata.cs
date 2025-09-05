using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

public class TVEpisodeMetadata
{
    public required int SeasonNumber { get; set; }
    public required int EpisodeNumber { get; set; }
    public required string Name { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    
    // File relation if tv show episode file exists in library
    public string? FilePath { get; set; }
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class TVEpisodeMetadataMapper
{
    [MapperIgnoreSource(nameof(TvEpisode.AccountStates))]
    [MapperIgnoreSource(nameof(TvEpisode.AirDate))]
    [MapperIgnoreSource(nameof(TvEpisode.Credits))]
    [MapperIgnoreSource(nameof(TvEpisode.Crew))]
    [MapperIgnoreSource(nameof(TvEpisode.ExternalIds))]
    [MapperIgnoreSource(nameof(TvEpisode.GuestStars))]
    [MapperIgnoreSource(nameof(TvEpisode.Id))]
    [MapperIgnoreSource(nameof(TvEpisode.Images))]
    [MapperIgnoreSource(nameof(TvEpisode.ProductionCode))]
    [MapperIgnoreSource(nameof(TvEpisode.Runtime))]
    [MapperIgnoreSource(nameof(TvEpisode.ShowId))]
    [MapperIgnoreSource(nameof(TvEpisode.StillPath))]
    [MapperIgnoreSource(nameof(TvEpisode.Translations))]
    [MapperIgnoreSource(nameof(TvEpisode.Videos))]
    [MapperIgnoreSource(nameof(TvEpisode.VoteCount))]
    public static partial TVEpisodeMetadata Create(this TvEpisode tvEpisode);
}

