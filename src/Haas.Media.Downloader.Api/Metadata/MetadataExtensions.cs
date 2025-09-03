namespace Haas.Media.Downloader.Api.Metadata;

public static class MetadataExtensions
{
    /// <summary>
    /// Gets the full URL for the movie poster (w500 size)
    /// </summary>
    /// <param name="movie">The movie metadata</param>
    /// <returns>Full poster URL or null if no poster path</returns>
    public static string? GetPosterUrl(this MovieMetadata movie)
    {
        return MetadataService.GetPosterUrl(movie.PosterPath);
    }

    /// <summary>
    /// Gets the full URL for the movie backdrop (w1280 size)
    /// </summary>
    /// <param name="movie">The movie metadata</param>
    /// <returns>Full backdrop URL or null if no backdrop path</returns>
    public static string? GetBackdropUrl(this MovieMetadata movie)
    {
        return MetadataService.GetBackdropUrl(movie.BackdropPath);
    }

    /// <summary>
    /// Gets the full URL for the TV show poster (w500 size)
    /// </summary>
    /// <param name="tvShow">The TV show metadata</param>
    /// <returns>Full poster URL or null if no poster path</returns>
    public static string? GetPosterUrl(this TVShowMetadata tvShow)
    {
        return MetadataService.GetPosterUrl(tvShow.PosterPath);
    }

    /// <summary>
    /// Gets the full URL for the TV show backdrop (w1280 size)
    /// </summary>
    /// <param name="tvShow">The TV show metadata</param>
    /// <returns>Full backdrop URL or null if no backdrop path</returns>
    public static string? GetBackdropUrl(this TVShowMetadata tvShow)
    {
        return MetadataService.GetBackdropUrl(tvShow.BackdropPath);
    }
}
