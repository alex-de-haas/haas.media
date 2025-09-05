using Riok.Mapperly.Abstractions;
using TMDbLib.Objects.General;

namespace Haas.Media.Downloader.Api.Metadata;

public class CrewMember
{
    public required int TmdbId { get; set; }
    public required string Name { get; set; }
    public required string Job { get; set; }
    public required string Department { get; set; }
    public string? ProfilePath { get; set; }
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class CrewMemberMapper
{
    [MapProperty(nameof(Crew.Id), nameof(CrewMember.TmdbId))]
    [MapperIgnoreSource(nameof(Crew.Adult))]
    [MapperIgnoreSource(nameof(Crew.CreditId))]
    [MapperIgnoreSource(nameof(Crew.Gender))]
    [MapperIgnoreSource(nameof(Crew.KnownForDepartment))]
    [MapperIgnoreSource(nameof(Crew.OriginalName))]
    [MapperIgnoreSource(nameof(Crew.Popularity))]
    public static partial CrewMember Map(this Crew crew);
}

