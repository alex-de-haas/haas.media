namespace Haas.Media.Downloader.Api.Metadata;

public class CrewMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Job { get; set; }
    public required string Department { get; set; }
    public string? ProfilePath { get; set; }
}
