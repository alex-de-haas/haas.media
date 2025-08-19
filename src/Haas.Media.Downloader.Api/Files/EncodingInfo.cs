namespace Haas.Media.Downloader.Api.Files;

public record EncodingInfo
{
    public required string Hash { get; set; }
    public required string OutputFileName { get; set; }
    public double Progress { get; set; }
}
