using System;

namespace Haas.Media.Downloader.Api.Jellyfin;

/// <summary>
/// Helper for generating and parsing Jellyfin-compatible identifiers that map back to internal entities.
/// </summary>
public static class JellyfinIdHelper
{
    private const string LibraryPrefix = "library-";
    private const string MoviePrefix = "movie-";
    private const string SeriesPrefix = "series-";
    private const string SeasonPrefix = "season-";
    private const string EpisodePrefix = "episode-";

    public static string CreateLibraryId(string libraryId) => $"{LibraryPrefix}{libraryId}";
    public static string CreateMovieId(int movieId) => $"{MoviePrefix}{movieId}";
    public static string CreateSeriesId(int seriesId) => $"{SeriesPrefix}{seriesId}";
    public static string CreateSeasonId(int seriesId, int seasonNumber) => $"{SeasonPrefix}{seriesId}-{seasonNumber}";
    public static string CreateEpisodeId(int seriesId, int seasonNumber, int episodeNumber) =>
        $"{EpisodePrefix}{seriesId}-{seasonNumber}-{episodeNumber}";

    public static bool TryParseLibraryId(string value, out string libraryId)
    {
        if (value.StartsWith(LibraryPrefix, StringComparison.OrdinalIgnoreCase))
        {
            libraryId = value[LibraryPrefix.Length..];
            return !string.IsNullOrWhiteSpace(libraryId);
        }

        libraryId = string.Empty;
        return false;
    }

    public static bool TryParseMovieId(string value, out int movieId)
    {
        movieId = default;
        if (!value.StartsWith(MoviePrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var numeric = value[MoviePrefix.Length..];
        return int.TryParse(numeric, out movieId);
    }

    public static bool TryParseSeriesId(string value, out int seriesId)
    {
        seriesId = default;
        if (!value.StartsWith(SeriesPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var numeric = value[SeriesPrefix.Length..];
        return int.TryParse(numeric, out seriesId);
    }

    public static bool TryParseSeasonId(string value, out int seriesId, out int seasonNumber)
    {
        seriesId = default;
        seasonNumber = default;

        if (!value.StartsWith(SeasonPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var remainder = value[SeasonPrefix.Length..];
        var parts = remainder.Split('-', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2)
        {
            return false;
        }

        return int.TryParse(parts[0], out seriesId) && int.TryParse(parts[1], out seasonNumber);
    }

    public static bool TryParseEpisodeId(string value, out int seriesId, out int seasonNumber, out int episodeNumber)
    {
        seriesId = default;
        seasonNumber = default;
        episodeNumber = default;

        if (!value.StartsWith(EpisodePrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var remainder = value[EpisodePrefix.Length..];
        var parts = remainder.Split('-', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 3)
        {
            return false;
        }

        return int.TryParse(parts[0], out seriesId)
            && int.TryParse(parts[1], out seasonNumber)
            && int.TryParse(parts[2], out episodeNumber);
    }
}
