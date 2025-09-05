namespace Haas.Media.Downloader.Api.Metadata;

public class CastMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Character { get; set; }
    public required int Order { get; set; }
    public string? ProfilePath { get; set; }
}

