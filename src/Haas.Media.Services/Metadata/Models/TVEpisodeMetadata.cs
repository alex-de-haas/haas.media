using TMDbLib.Objects.TvShows;
using TMDbLib.Objects.Search;

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
    public static TVEpisodeMetadata Create(this TvEpisode tvEpisode)
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
            Cast = MapGuestStars(tvEpisode),
            Crew = MapCrew(tvEpisode)
        };
    }

    private static CastMember[] MapGuestStars(TvEpisode tvEpisode)
    {
        if (tvEpisode.GuestStars is null)
        {
            return [];
        }

        return tvEpisode
            .GuestStars.Select(guest => new CastMember
            {
                Id = guest.Id,
                Name = guest.Name,
                Character = guest.Character,
                Order = guest.Order,
                ProfilePath = guest.ProfilePath
            })
            .ToArray();
    }

    private static CrewMember[] MapCrew(TvEpisode tvEpisode)
    {
        if (tvEpisode.Crew is null)
        {
            return [];
        }

        return tvEpisode
            .Crew.Select(crew => new CrewMember
            {
                Id = crew.Id,
                Name = crew.Name,
                Job = crew.Job,
                Department = crew.Department,
                ProfilePath = crew.ProfilePath
            })
            .ToArray();
    }
}

