using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class Network
{
    public required int TmdbId { get; set; }
    public required string Name { get; set; }
    public string? LogoPath { get; set; }
    public string? OriginCountry { get; set; }
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class NetworkMapper
{
    [MapProperty(nameof(NetworkWithLogo.Id), nameof(Network.TmdbId))]
    public static partial Network Map(this NetworkWithLogo network);
}
