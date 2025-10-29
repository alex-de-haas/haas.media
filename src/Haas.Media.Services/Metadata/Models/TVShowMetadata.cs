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
    public string? LogoPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public Network[] Networks { get; set; } = [];
    public TVSeasonMetadata[] Seasons { get; set; } = [];
    public string? OfficialRating { get; set; }
    public DateTime? FirstAirDate { get; set; }
    public string? Status { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class TVShowMetadataMapper
{
    public static TVShowMetadata Create(
        this TvShow tvShow,
        int topCastCount,
        int topCrewCount,
        string? preferredCountryCode = null,
        string? preferredLanguage = null
    )
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
            LogoPath = GetBestLogo(tvShow.Images, preferredLanguage),
            Genres = MapGenres(tvShow),
            Crew = CreditsSelector.SelectTopCrewForTv(tvShow.Credits, tvShow.CreatedBy, topCrewCount),
            Cast = CreditsSelector.SelectTopCastForTv(tvShow.Credits, topCastCount),
            Networks = MapNetworks(tvShow),
            OfficialRating = GetOfficialRating(tvShow, preferredCountryCode),
            FirstAirDate = tvShow.FirstAirDate,
            Status = tvShow.Status,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void Update(
        this TvShow source,
        TVShowMetadata target,
        int topCastCount,
        int topCrewCount,
        string? preferredCountryCode = null,
        string? preferredLanguage = null
    )
    {
        target.OriginalTitle = source.OriginalName;
        target.OriginalLanguage = source.OriginalLanguage;
        target.Title = source.Name;
        target.Overview = source.Overview;
        target.VoteAverage = source.VoteAverage;
        target.VoteCount = source.VoteCount;
        target.PosterPath = source.PosterPath;
        target.BackdropPath = source.BackdropPath;
        target.LogoPath = GetBestLogo(source.Images, preferredLanguage);
        target.Genres = MapGenres(source);
        target.Crew = CreditsSelector.SelectTopCrewForTv(source.Credits, source.CreatedBy, topCrewCount);
        target.Cast = CreditsSelector.SelectTopCastForTv(source.Credits, topCastCount);
        target.Networks = MapNetworks(source);
        target.OfficialRating = GetOfficialRating(source, preferredCountryCode);
        target.FirstAirDate = source.FirstAirDate;
        target.Status = source.Status;
        target.UpdatedAt = DateTime.UtcNow;
    }

    private static string[] MapGenres(TvShow source)
    {
        return source.Genres?.Select(g => g.Name).ToArray() ?? [];
    }

    private static Network[] MapNetworks(TvShow source)
    {
        return source.Networks?.Select(n => n.Map()).ToArray() ?? [];
    }

    private static string? GetBestLogo(
        TMDbLib.Objects.General.Images? images,
        string? preferredLanguage
    )
    {
        if (images?.Logos == null || images.Logos.Count == 0)
        {
            return null;
        }

        var normalizedPreferred = NormalizeLanguageCode(preferredLanguage) ?? "en";

        // Prefer user's preferred language, then English, then null language (universal), then highest voted
        var logo = images
            .Logos.OrderByDescending(l =>
                string.Equals(l.Iso_639_1, normalizedPreferred, StringComparison.OrdinalIgnoreCase)
            )
            .ThenByDescending(l => l.Iso_639_1 == "en")
            .ThenByDescending(l => l.Iso_639_1 == null)
            .ThenByDescending(l => l.VoteAverage)
            .ThenByDescending(l => l.VoteCount)
            .FirstOrDefault();

        return logo?.FilePath;
    }

    private static string? NormalizeLanguageCode(string? languageCode)
    {
        if (string.IsNullOrWhiteSpace(languageCode))
        {
            return null;
        }

        // Language codes can be in format "en-US" or "en", we want just "en"
        var normalized = languageCode.Trim();
        if (normalized.Contains('-'))
        {
            normalized = normalized.Split('-')[0];
        }

        normalized = normalized.ToLowerInvariant();
        if (normalized.Length != 2 || normalized.Any(ch => ch is < 'a' or > 'z'))
        {
            return null;
        }

        return normalized;
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
            string.Equals(r.Iso_3166_1, normalizedPreferred, StringComparison.OrdinalIgnoreCase)
        );

        if (preferredRating != null && !string.IsNullOrWhiteSpace(preferredRating.Rating))
        {
            return preferredRating.Rating;
        }

        // Fallback to any available rating
        var anyRating = contentRatings.FirstOrDefault(r => !string.IsNullOrWhiteSpace(r.Rating));

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
