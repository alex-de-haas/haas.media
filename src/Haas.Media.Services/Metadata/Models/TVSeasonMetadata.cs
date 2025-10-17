using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public string? PosterPath { get; set; }
    public TVEpisodeMetadata[] Episodes { get; set; } = [];
}

static class TVSeasonMetadataMapper
{
    public static TVSeasonMetadata Create(this TvSeason tvSeason)
    {
        return new TVSeasonMetadata
        {
            SeasonNumber = tvSeason.SeasonNumber,
            Overview = tvSeason.Overview,
            VoteAverage = tvSeason.VoteAverage,
            PosterPath = tvSeason.PosterPath
        };
    }
}