using LiteDB;
using TMDbLib.Objects.Movies;

namespace Haas.Media.Downloader.Api.Metadata;

public class MovieMetadata
{
    [BsonId]
    public string? Id { get; set; }
    
    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public DateTime? TheatricalReleaseDate { get; set; }
    public DateTime? DigitalReleaseDate { get; set; }
    public long Budget { get; set; }
    public long Revenue { get; set; }
    
    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    
    // Library and file relation if movie file exists in library
    public string? LibraryId { get; set; }
    public string? FilePath { get; set; }
    
    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class MovieMetadataMapper
{
    public static MovieMetadata Create(this Movie source, string id)
    {
        return new MovieMetadata
        {
            Id = id,
            TmdbId = source.Id,
            OriginalTitle = source.OriginalTitle,
            OriginalLanguage = source.OriginalLanguage,
            Title = source.Title,
            Overview = source.Overview,
            VoteAverage = source.VoteAverage,
            VoteCount = source.VoteCount,
            ReleaseDate = source.ReleaseDate,
            Budget = source.Budget,
            Revenue = source.Revenue,
            PosterPath = source.PosterPath,
            BackdropPath = source.BackdropPath,
            Genres = MapGenres(source),
            Crew = MapCrew(source.Credits),
            Cast = MapCast(source.Credits),
            TheatricalReleaseDate = MovieReleaseDateHelper.GetTheatricalReleaseDate(source),
            DigitalReleaseDate = MovieReleaseDateHelper.GetDigitalReleaseDate(source),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public static void Update(this Movie source, MovieMetadata target)
    {
        target.OriginalTitle = source.OriginalTitle;
        target.OriginalLanguage = source.OriginalLanguage;
        target.Title = source.Title;
        target.Overview = source.Overview;
        target.VoteAverage = source.VoteAverage;
        target.VoteCount = source.VoteCount;
        target.ReleaseDate = source.ReleaseDate;
        target.Budget = source.Budget;
        target.Revenue = source.Revenue;
        target.PosterPath = source.PosterPath;
        target.BackdropPath = source.BackdropPath;
        target.UpdatedAt = DateTime.UtcNow;
        target.Genres = MapGenres(source);
        target.Crew = MapCrew(source.Credits);
        target.Cast = MapCast(source.Credits);
        target.TheatricalReleaseDate = MovieReleaseDateHelper.GetTheatricalReleaseDate(source);
        target.DigitalReleaseDate = MovieReleaseDateHelper.GetDigitalReleaseDate(source);
        target.UpdatedAt = DateTime.UtcNow;
    }

    private static CrewMember[] MapCrew(Credits credits)
    {
        return credits.Crew.Select(c => c.Map()).ToArray();
    }

    private static CastMember[] MapCast(Credits credits)
    {
        return credits.Cast.Select(c => c.Map()).ToArray();
    }

    private static string[] MapGenres(Movie source)
    {
        return source.Genres?.Select(g => g.Name).ToArray() ?? [];
    }
}
