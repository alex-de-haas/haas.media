using System;
using System.Collections.Generic;
using System.Linq;
using TMDbLib.Objects.General;
using TMDbLib.Objects.TvShows;
using MovieCredits = TMDbLib.Objects.Movies.Credits;
using MovieCast = TMDbLib.Objects.Movies.Cast;
using TvCast = TMDbLib.Objects.TvShows.Cast;
using TvSeasonCredits = TMDbLib.Objects.TvShows.Credits;

namespace Haas.Media.Services.Metadata;

internal static class PersonMetadataCollector
{
    public static IEnumerable<int> FromCredits(MovieCredits? credits)
    {
        return credits is null
            ? Array.Empty<int>()
            : EnumerateIds(credits.Cast, cast => cast.Id).Concat(
                EnumerateIds(credits.Crew, crew => crew.Id)
            );
    }

    public static IEnumerable<int> FromCredits(TvSeasonCredits? credits)
    {
        if (credits is null)
        {
            return Array.Empty<int>();
        }

        return EnumerateIds(credits.Cast, cast => cast.Id)
            .Concat(EnumerateIds(credits.Crew, crew => crew.Id));
    }

    public static IEnumerable<int> FromCredits(CreditsWithGuestStars? credits)
    {
        if (credits is null)
        {
            return Array.Empty<int>();
        }

        return EnumerateIds(credits.Cast, cast => cast.Id)
            .Concat(EnumerateIds(credits.Crew, crew => crew.Id))
            .Concat(EnumerateIds(credits.GuestStars, guest => guest.Id));
    }

    public static IEnumerable<int> FromCrew(IEnumerable<Crew>? crew)
    {
        return EnumerateIds(crew, member => member.Id);
    }

    public static IEnumerable<int> FromCast(IEnumerable<MovieCast>? cast)
    {
        return EnumerateIds(cast, member => member.Id);
    }

    public static IEnumerable<int> FromCast(IEnumerable<TvCast>? cast)
    {
        return EnumerateIds(cast, member => member.Id);
    }

    public static IEnumerable<int> FromCreators(IEnumerable<CreatedBy>? creators)
    {
        return EnumerateIds(creators, creator => creator.Id);
    }

    private static IEnumerable<int> EnumerateIds<T>(IEnumerable<T>? source, Func<T, int> selector)
    {
        if (source is null)
        {
            return Array.Empty<int>();
        }

        return source
            .Select(selector)
            .Where(id => id > 0);
    }
}
