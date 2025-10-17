using System;
using System.Collections.Generic;
using System.Linq;
using TMDbLib.Objects.Movies;

namespace Haas.Media.Services.Metadata;

internal static class MovieReleaseDateHelper
{
    private const string DefaultCountryCode = "US";

    public static ReleaseDate[] GetReleaseDates(Movie movie, string? preferredCountryCode = null)
    {
        ArgumentNullException.ThrowIfNull(movie);

        var releases = movie.ReleaseDates?.Results;
        if (releases == null || releases.Count == 0)
        {
            return [];
        }

        var normalizedPreferred = NormalizeCountryCode(preferredCountryCode, DefaultCountryCode);

        var releaseDates = new List<ReleaseDate>();

        foreach (var countryRelease in releases)
        {
            if (countryRelease.ReleaseDates == null)
            {
                continue;
            }

            var countryCode = NormalizeCountryCode(countryRelease.Iso_3166_1, DefaultCountryCode);

            foreach (var release in countryRelease.ReleaseDates)
            {
                if (release.ReleaseDate == default)
                {
                    continue;
                }

                releaseDates.Add(new ReleaseDate
                {
                    Type = MapReleaseType(release.Type),
                    Date = release.ReleaseDate.Date,
                    CountryCode = countryCode
                });
            }
        }

        // Sort by date and remove duplicates
        return releaseDates
            .GroupBy(r => new { r.Type, r.Date, CountryCode = r.CountryCode ?? DefaultCountryCode })
            .Select(g => g.First())
            .OrderBy(r => string.Equals(r.CountryCode, normalizedPreferred, StringComparison.OrdinalIgnoreCase) ? 0 : 1)
            .ThenBy(r => r.Date)
            .ThenBy(r => r.Type)
            .ToArray();
    }

    public static ReleaseDate[] FilterReleaseDates(IEnumerable<ReleaseDate> releaseDates, string? countryCode)
    {
        if (releaseDates == null)
        {
            return [];
        }

        var normalizedCountry = NormalizeCountryCode(countryCode, DefaultCountryCode);
        var releases = releaseDates.ToList();
        if (releases.Count == 0)
        {
            return [];
        }

        var preferred = releases
            .Where(r => string.Equals(r.CountryCode, normalizedCountry, StringComparison.OrdinalIgnoreCase))
            .OrderBy(r => r.Date)
            .ThenBy(r => r.Type)
            .ToArray();

        if (preferred.Length > 0)
        {
            return preferred;
        }

        return releases
            .OrderBy(r => r.Date)
            .ThenBy(r => r.Type)
            .ToArray();
    }

    private static ReleaseDateType MapReleaseType(TMDbLib.Objects.Movies.ReleaseDateType tmdbType)
    {
        return tmdbType switch
        {
            TMDbLib.Objects.Movies.ReleaseDateType.Premiere => ReleaseDateType.Premiere,
            TMDbLib.Objects.Movies.ReleaseDateType.TheatricalLimited => ReleaseDateType.TheatricalLimited,
            TMDbLib.Objects.Movies.ReleaseDateType.Theatrical => ReleaseDateType.Theatrical,
            TMDbLib.Objects.Movies.ReleaseDateType.Digital => ReleaseDateType.Digital,
            TMDbLib.Objects.Movies.ReleaseDateType.Physical => ReleaseDateType.Physical,
            TMDbLib.Objects.Movies.ReleaseDateType.TV => ReleaseDateType.Tv,
            _ => ReleaseDateType.Theatrical
        };
    }

    private static string NormalizeCountryCode(string? countryCode, string fallback)
    {
        if (string.IsNullOrWhiteSpace(countryCode))
        {
            return fallback;
        }

        var normalized = countryCode.Trim().ToUpperInvariant();
        if (normalized.Length != 2 || normalized.Any(ch => ch is < 'A' or > 'Z'))
        {
            return fallback;
        }

        return normalized;
    }
}
