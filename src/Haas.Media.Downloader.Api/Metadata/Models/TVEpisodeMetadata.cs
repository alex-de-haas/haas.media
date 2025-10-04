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

static class TVEpisodeMetadataMapper
{
    public static TVEpisodeMetadata Create(this TvEpisode tvEpisode)
    {
        return new TVEpisodeMetadata
        {
            SeasonNumber = tvEpisode.SeasonNumber,
            EpisodeNumber = tvEpisode.EpisodeNumber,
            Name = tvEpisode.Name,
            Overview = tvEpisode.Overview,
            VoteAverage = tvEpisode.VoteAverage
        };
    }
}

