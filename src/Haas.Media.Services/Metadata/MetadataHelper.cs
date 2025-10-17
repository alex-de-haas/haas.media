using System.Text.RegularExpressions;

namespace Haas.Media.Services.Metadata;

public static class MetadataHelper
{
    public static string ExtractMovieTitleFromFileName(string fileName)
    {
        // Remove file extension
        var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);

        // Common patterns to clean movie titles from file names
        var patterns = new[]
        {
            @"\.\d{4}\.", // Remove year with dots (e.g., .2018.)
            @"\s+\d{4}\s+", // Remove year with spaces
            @"\s+\(\d{4}\)", // Remove year in parentheses
            @"\s*[\[\(].*?[\]\)]", // Remove anything in brackets or parentheses
            @"\s*\d{3,4}p.*", // Remove resolution and everything after (720p, 1080p, etc.)
            @"\s*BluRay.*", // Remove BluRay and everything after
            @"\s*BDRip.*", // Remove BDRip and everything after
            @"\s*WEBRip.*", // Remove WEBRip and everything after
            @"\s*HDRip.*", // Remove HDRip and everything after
            @"\s*DVDRip.*", // Remove DVDRip and everything after
            @"\s*x264.*", // Remove codec and everything after
            @"\s*x265.*", // Remove codec and everything after
            @"\s*H\.?264.*", // Remove codec and everything after
            @"\s*H\.?265.*", // Remove codec and everything after
            @"\s*HEVC.*", // Remove codec and everything after
            @"\s*AAC.*", // Remove audio codec and everything after
            @"\s*AC3.*", // Remove audio codec and everything after
            @"\s*DTS.*", // Remove audio codec and everything after
            @"\s*-.*", // Remove dash and everything after
            @"\s*\[.*", // Remove opening bracket and everything after
            @"\.rus\.", // Remove Russian language marker
            @"\.LostFilm\.TV", // Remove LostFilm.TV marker
            @"S\d{2}E\d{2}", // Remove TV series episode markers
        };

        var cleanedTitle = nameWithoutExtension;

        foreach (var pattern in patterns)
        {
            cleanedTitle = Regex.Replace(cleanedTitle, pattern, " ", RegexOptions.IgnoreCase);
        }

        // Replace dots and underscores with spaces
        cleanedTitle = cleanedTitle.Replace(".", " ").Replace("_", " ");

        // Clean up multiple spaces and trim
        cleanedTitle = Regex.Replace(cleanedTitle, @"\s+", " ").Trim();

        return cleanedTitle;
    }

    public static string? ExtractTVShowTitleFromDirectoryName(string? directoryName)
    {
        if (string.IsNullOrEmpty(directoryName))
        {
            return null;
        }

        // Common patterns to clean TV show titles from directory names
        var patterns = new[]
        {
            @"\s+\d{4}\s*-\s*\d{4}", // Remove year range (e.g., 2020-2023)
            @"\s+\(\d{4}\)", // Remove year in parentheses
            @"\s*[\[\(].*?[\]\)]", // Remove anything in brackets or parentheses
            @"\s*-\s*LostFilm\.TV.*", // Remove LostFilm.TV and everything after
            @"\s*\[.*?\].*", // Remove anything in square brackets and after
            @"\s+S\d{2}.*", // Remove season indicators and everything after
            @"\s+Season\s+\d+.*", // Remove "Season X" and everything after
            @"\s+Complete.*", // Remove "Complete" and everything after
            @"\s*-\s*.*", // Remove dash and everything after (be careful with this)
        };

        var cleanedTitle = directoryName;

        foreach (var pattern in patterns)
        {
            cleanedTitle = Regex.Replace(cleanedTitle, pattern, "", RegexOptions.IgnoreCase);
        }

        // Replace dots and underscores with spaces
        cleanedTitle = cleanedTitle.Replace(".", " ").Replace("_", " ");

        // Clean up multiple spaces and trim
        cleanedTitle = Regex.Replace(cleanedTitle, @"\s+", " ").Trim();

        return cleanedTitle;
    }

    public static int? ExtractYearFromString(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var matches = Regex.Matches(value, @"(?<!\d)(?:19|20)\d{2}(?!\d)");

        foreach (Match match in matches)
        {
            if (!int.TryParse(match.Value, out var year))
            {
                continue;
            }

            var upperBound = System.DateTime.UtcNow.Year + 1;

            if (year < 1900 || year > upperBound)
            {
                continue;
            }

            return year;
        }

        return null;
    }
}
