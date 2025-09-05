using Riok.Mapperly.Abstractions;
using MovieCast = TMDbLib.Objects.Movies.Cast;
using TvShowCast = TMDbLib.Objects.TvShows.Cast;

namespace Haas.Media.Downloader.Api.Metadata;

public class CastMember
{
    public required int TmdbId { get; set; }
    public required string Name { get; set; }
    public required string Character { get; set; }
    public required int Order { get; set; }
    public string? ProfilePath { get; set; }
}

[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Source)]
static partial class CastMemberMapper
{
    [MapProperty(nameof(MovieCast.Id), nameof(CastMember.TmdbId))]
    [MapperIgnoreSource(nameof(MovieCast.Adult))]
    [MapperIgnoreSource(nameof(MovieCast.CastId))]
    [MapperIgnoreSource(nameof(MovieCast.CreditId))]
    [MapperIgnoreSource(nameof(MovieCast.Gender))]
    [MapperIgnoreSource(nameof(MovieCast.KnownForDepartment))]
    [MapperIgnoreSource(nameof(MovieCast.OriginalName))]
    [MapperIgnoreSource(nameof(MovieCast.Popularity))]
    public static partial CastMember Map(this MovieCast cast);

    [MapProperty(nameof(TvShowCast.Id), nameof(CastMember.TmdbId))]
    [MapperIgnoreSource(nameof(MovieCast.Adult))]
    [MapperIgnoreSource(nameof(MovieCast.CreditId))]
    [MapperIgnoreSource(nameof(MovieCast.Gender))]
    [MapperIgnoreSource(nameof(MovieCast.KnownForDepartment))]
    [MapperIgnoreSource(nameof(MovieCast.OriginalName))]
    [MapperIgnoreSource(nameof(MovieCast.Popularity))]
    public static partial CastMember Map(this TvShowCast cast);
}
