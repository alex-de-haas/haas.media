using TMDbLib.Objects.General;

namespace Haas.Media.Services.Metadata;

public class CrewMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Job { get; set; }
    public required string Department { get; set; }
    public string? ProfilePath { get; set; }
    public int Weight { get; set; }
}

static class CrewMemberMapper
{
    public static CrewMember Map(this Crew crew)
    {
        return new CrewMember
        {
            Id = crew.Id,
            Name = crew.Name,
            Job = crew.Job,
            Department = crew.Department,
            ProfilePath = crew.ProfilePath,
            Weight = 0 // Default weight when not calculated by CreditsSelector
        };
    }
}
