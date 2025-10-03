using System;
using System.Linq;
using TMDbLib.Objects.General;
using TMDbLib.Objects.Movies;

namespace Haas.Media.Downloader.Api.Metadata;

internal static class MovieReleaseDateHelper
{
    private const string DefaultCountryCode = "US";

    public static DateTime? GetDigitalReleaseDate(Movie movie, string? countryCode = null)
    {
        ArgumentNullException.ThrowIfNull(movie);

        var releases = movie.ReleaseDates?.Results;
        if (releases == null || releases.Count == 0)
        {
            return null;
        }

        var preferredCountryCode = string.IsNullOrWhiteSpace(countryCode)
            ? DefaultCountryCode
            : countryCode;

        var countryRelease = releases
            .FirstOrDefault(r => string.Equals(r.Iso_3166_1, preferredCountryCode, StringComparison.OrdinalIgnoreCase))
            ?? releases.FirstOrDefault(r => r.ReleaseDates?.Any(d => d.Type == ReleaseDateType.Digital) == true);

        var digitalRelease = countryRelease
            ?.ReleaseDates
            ?.Where(r => r.Type == ReleaseDateType.Digital && r.ReleaseDate != default)
            .OrderBy(r => r.ReleaseDate)
            .FirstOrDefault();

        if (digitalRelease is null)
        {
            return null;
        }

        var releaseDate = digitalRelease.ReleaseDate;
        return releaseDate == default ? null : releaseDate.Date;
    }
}
