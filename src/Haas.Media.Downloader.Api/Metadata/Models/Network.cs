using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class Network
{
    public required int TmdbId { get; set; }
    public required string Name { get; set; }
    public required string LogoPath { get; set; }
    public required string OriginCountry { get; set; }
}

static class NetworkMapper
{
    public static Network Map(this NetworkWithLogo network)
    {
        return new Network
        {
            TmdbId = network.Id,
            Name = network.Name,
            LogoPath = network.LogoPath ?? string.Empty,
            OriginCountry = network.OriginCountry
        };
    }
}
