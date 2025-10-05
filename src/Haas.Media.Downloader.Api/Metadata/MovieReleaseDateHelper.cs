using TMDbLib.Objects.Movies;

namespace Haas.Media.Downloader.Api.Metadata;

internal static class MovieReleaseDateHelper
{
    private const string DefaultCountryCode = "US";

    public static ReleaseDate[] GetReleaseDates(Movie movie, string? countryCode = null)
    {
        ArgumentNullException.ThrowIfNull(movie);

        var releases = movie.ReleaseDates?.Results;
        if (releases == null || releases.Count == 0)
        {
            return [];
        }

        var preferredCountryCode = string.IsNullOrWhiteSpace(countryCode)
            ? DefaultCountryCode
            : countryCode;

        var releaseDates = new List<ReleaseDate>();

        // Get releases for preferred country
        var countryRelease = releases
            .FirstOrDefault(r => string.Equals(r.Iso_3166_1, preferredCountryCode, StringComparison.OrdinalIgnoreCase));

        if (countryRelease?.ReleaseDates != null)
        {
            foreach (var release in countryRelease.ReleaseDates)
            {
                if (release.ReleaseDate != default)
                {
                    releaseDates.Add(new ReleaseDate
                    {
                        Type = MapReleaseType(release.Type),
                        Date = release.ReleaseDate.Date,
                        CountryCode = countryRelease.Iso_3166_1
                    });
                }
            }
        }

        // If no country-specific releases found, get all releases
        if (releaseDates.Count == 0)
        {
            foreach (var countryReleaseItem in releases)
            {
                if (countryReleaseItem.ReleaseDates != null)
                {
                    foreach (var release in countryReleaseItem.ReleaseDates)
                    {
                        if (release.ReleaseDate != default)
                        {
                            releaseDates.Add(new ReleaseDate
                            {
                                Type = MapReleaseType(release.Type),
                                Date = release.ReleaseDate.Date,
                                CountryCode = countryReleaseItem.Iso_3166_1
                            });
                        }
                    }
                }
            }
        }

        // Sort by date and remove duplicates
        return releaseDates
            .OrderBy(r => r.Date)
            .GroupBy(r => new { r.Type, r.Date })
            .Select(g => g.First())
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
}
