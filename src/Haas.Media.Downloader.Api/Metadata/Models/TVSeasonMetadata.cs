namespace Haas.Media.Downloader.Api.Metadata;

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required TVEpisodeMetadata[] Episodes { get; set; }

    // TMDB image path
    public string? PosterPath { get; set; }
}

