using LiteDB;
using TMDbLib.Objects.Movies;

namespace Haas.Media.Services.Metadata;

public class MovieMetadata
{
    [BsonId]
    public required int Id { get; set; }
    
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public ReleaseDate[] ReleaseDates { get; set; } = [];
    public long Budget { get; set; }
    public long Revenue { get; set; }
    
    // TMDB image paths
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
    public string? LogoPath { get; set; }

    // Related metadata
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public string? OfficialRating { get; set; }
    
    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class MovieMetadataMapper
{
    public static MovieMetadata Create(this Movie source, string? preferredCountryCode = null, string? preferredLanguage = null)
    {
        return new MovieMetadata
        {
            Id = source.Id,
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
            LogoPath = GetBestLogo(source.Images, preferredLanguage),
            Genres = MapGenres(source),
            Crew = MapCrew(source.Credits),
            Cast = MapCast(source.Credits),
            ReleaseDates = MovieReleaseDateHelper.GetReleaseDates(source, preferredCountryCode),
            OfficialRating = GetOfficialRating(source, preferredCountryCode),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };
    }

    public static void Update(this Movie source, MovieMetadata target, string? preferredCountryCode = null, string? preferredLanguage = null)
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
        target.LogoPath = GetBestLogo(source.Images, preferredLanguage);
        target.UpdatedAt = DateTime.UtcNow;
        target.Genres = MapGenres(source);
        target.Crew = MapCrew(source.Credits);
        target.Cast = MapCast(source.Credits);
        target.ReleaseDates = MovieReleaseDateHelper.GetReleaseDates(source, preferredCountryCode);
        target.OfficialRating = GetOfficialRating(source, preferredCountryCode);
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

    private static string? GetBestLogo(TMDbLib.Objects.General.Images? images, string? preferredLanguage)
    {
        if (images?.Logos == null || images.Logos.Count == 0)
        {
            return null;
        }

        var normalizedPreferred = NormalizeLanguageCode(preferredLanguage) ?? "en";

        // Prefer user's preferred language, then English, then null language (universal), then highest voted
        var logo = images.Logos
            .OrderByDescending(l => string.Equals(l.Iso_639_1, normalizedPreferred, StringComparison.OrdinalIgnoreCase))
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

    private static string? GetOfficialRating(Movie source, string? preferredCountryCode = null)
    {
        // TMDb provides certifications through ReleaseDates
        // Prefer user's preferred country certification, fallback to first available
        var releases = source.ReleaseDates?.Results;
        if (releases == null || releases.Count == 0)
        {
            return null;
        }

        var normalizedPreferred = NormalizeCountryCode(preferredCountryCode) ?? "US";

        // Try to find preferred country certification first
        var preferredRelease = releases.FirstOrDefault(r => 
            string.Equals(r.Iso_3166_1, normalizedPreferred, StringComparison.OrdinalIgnoreCase));
        
        if (preferredRelease?.ReleaseDates != null)
        {
            var certification = preferredRelease.ReleaseDates
                .Where(rd => !string.IsNullOrWhiteSpace(rd.Certification))
                .Select(rd => rd.Certification)
                .FirstOrDefault();
            
            if (!string.IsNullOrWhiteSpace(certification))
            {
                return certification;
            }
        }

        // Fallback to any available certification
        foreach (var countryRelease in releases)
        {
            if (countryRelease.ReleaseDates == null)
            {
                continue;
            }

            var certification = countryRelease.ReleaseDates
                .Where(rd => !string.IsNullOrWhiteSpace(rd.Certification))
                .Select(rd => rd.Certification)
                .FirstOrDefault();

            if (!string.IsNullOrWhiteSpace(certification))
            {
                return certification;
            }
        }

        return null;
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
