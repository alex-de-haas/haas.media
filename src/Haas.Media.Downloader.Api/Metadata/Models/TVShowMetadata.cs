using LiteDB;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class TVShowMetadata
{
    [BsonId]
    public required int Id { get; set; }

    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }

    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public Network[] Networks { get; set; } = [];
    public TVSeasonMetadata[] Seasons { get; set; } = [];

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class TVShowMetadataMapper
{
    public static TVShowMetadata Create(this TvShow tvShow)
    {
        return new TVShowMetadata
        {
            Id = tvShow.Id,
            OriginalTitle = tvShow.OriginalName,
            OriginalLanguage = tvShow.OriginalLanguage,
            Title = tvShow.Name,
            Overview = tvShow.Overview,
            VoteAverage = tvShow.VoteAverage,
            VoteCount = tvShow.VoteCount,
            PosterPath = tvShow.PosterPath,
            BackdropPath = tvShow.BackdropPath,
            Genres = MapGenres(tvShow),
            Crew = MapCrew(tvShow),
            Cast = MapCast(tvShow),
            Networks = MapNetworks(tvShow),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void Update(this TvShow source, TVShowMetadata target)
    {
        target.OriginalTitle = source.OriginalName;
        target.OriginalLanguage = source.OriginalLanguage;
        target.Title = source.Name;
        target.Overview = source.Overview;
        target.VoteAverage = source.VoteAverage;
        target.VoteCount = source.VoteCount;
        target.PosterPath = source.PosterPath;
        target.BackdropPath = source.BackdropPath;
        target.Genres = MapGenres(source);
        target.Crew = MapCrew(source);
        target.Cast = MapCast(source);
        target.Networks = MapNetworks(source);
        target.UpdatedAt = DateTime.UtcNow;
    }

    private static CrewMember[] MapCrew(TvShow tvShow)
    {
        return tvShow.Credits.Crew.Select(c => c.Map()).ToArray();
    }

    private static CastMember[] MapCast(TvShow tvShow)
    {
        return tvShow.Credits.Cast.Select(c => c.Map()).ToArray();
    }

    private static string[] MapGenres(TvShow source)
    {
        return source.Genres?.Select(g => g.Name).ToArray() ?? [];
    }

    private static Network[] MapNetworks(TvShow source)
    {
        return source.Networks?.Select(n => n.Map()).ToArray() ?? [];
    }
}
