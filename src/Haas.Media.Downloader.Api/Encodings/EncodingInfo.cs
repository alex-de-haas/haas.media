namespace Haas.Media.Downloader.Api.Encodings;

public record EncodingInfo
{
    public required string Id { get; set; }
    public required string SourcePath { get; set; }
    public required string OutputPath { get; set; }
    public double Progress { get; set; }
    // Elapsed encoding time in seconds
    public double ElapsedTimeSeconds { get; set; }
    // Estimated remaining time in seconds
    public double EstimatedTimeSeconds { get; set; }
}
