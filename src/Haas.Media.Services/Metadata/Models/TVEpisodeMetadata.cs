using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

public class TVEpisodeMetadata
{
    public required int SeasonNumber { get; set; }
    public required int EpisodeNumber { get; set; }
    public required string Name { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? AirDate { get; set; }
    public int? Runtime { get; set; }
    public string? StillPath { get; set; }
    public CastMember[] Cast { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
}

static class TVEpisodeMetadataMapper
{
    private const int DefaultTopGuestStarsCount = 20;
    private const int DefaultTopCrewCount = 12;

    public static TVEpisodeMetadata Create(
        this TvEpisode tvEpisode,
        int topGuestStarsCount = DefaultTopGuestStarsCount,
        int topCrewCount = DefaultTopCrewCount
    )
    {
        return new TVEpisodeMetadata
        {
            SeasonNumber = tvEpisode.SeasonNumber,
            EpisodeNumber = tvEpisode.EpisodeNumber,
            Name = tvEpisode.Name,
            Overview = tvEpisode.Overview,
            VoteAverage = tvEpisode.VoteAverage,
            VoteCount = tvEpisode.VoteCount,
            AirDate = tvEpisode.AirDate,
            Runtime = tvEpisode.Runtime,
            StillPath = tvEpisode.StillPath,
            Cast = CreditsSelector.SelectTopGuestStars(tvEpisode.GuestStars, topGuestStarsCount),
            Crew = CreditsSelector.SelectTopCrewForEpisode(tvEpisode.Crew, topCrewCount)
        };
    }
}
