using LiteDB;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

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
    public string? OfficialRating { get; set; }
    public DateTime? FirstAirDate { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class TVShowMetadataMapper
{
    public static TVShowMetadata Create(this TvShow tvShow, string? preferredCountryCode = null)
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
            OfficialRating = GetOfficialRating(tvShow, preferredCountryCode),
            FirstAirDate = tvShow.FirstAirDate,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void Update(this TvShow source, TVShowMetadata target, string? preferredCountryCode = null)
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
        target.OfficialRating = GetOfficialRating(source, preferredCountryCode);
        target.FirstAirDate = source.FirstAirDate;
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

    private static string? GetOfficialRating(TvShow source, string? preferredCountryCode = null)
    {
        // TMDb provides content ratings for TV shows
        // Prefer user's preferred country rating, fallback to first available
        var contentRatings = source.ContentRatings?.Results;
        if (contentRatings == null || contentRatings.Count == 0)
        {
            return null;
        }

        var normalizedPreferred = NormalizeCountryCode(preferredCountryCode) ?? "US";

        // Try to find preferred country rating first
        var preferredRating = contentRatings.FirstOrDefault(r => 
            string.Equals(r.Iso_3166_1, normalizedPreferred, StringComparison.OrdinalIgnoreCase));
        
        if (preferredRating != null && !string.IsNullOrWhiteSpace(preferredRating.Rating))
        {
            return preferredRating.Rating;
        }

        // Fallback to any available rating
        var anyRating = contentRatings.FirstOrDefault(r => 
            !string.IsNullOrWhiteSpace(r.Rating));
        
        return anyRating?.Rating;
    }

    private static string? NormalizeCountryCode(string? countryCode)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return null;
        }

        var normalized = countryCode.Trim().ToUpperInvariant();
        if (normalized.Length != 2 || normalized.Any(ch => ch is < 'A' or > 'Z'))
        {
            return null;
        }

        return normalized;
    }
}
