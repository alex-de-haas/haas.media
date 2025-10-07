using MovieCast = TMDbLib.Objects.Movies.Cast;
using TvShowCast = TMDbLib.Objects.TvShows.Cast;

namespace Haas.Media.Downloader.Api.Metadata;

public class CastMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Character { get; set; }
    public required int Order { get; set; }
    public string? ProfilePath { get; set; }
}

static class CastMemberMapper
{
    public static CastMember Map(this MovieCast cast)
    {
        return new CastMember
        {
            Id = cast.Id,
            Name = cast.Name,
            Character = cast.Character,
            Order = cast.Order,
            ProfilePath = cast.ProfilePath
        };
    }

    public static CastMember Map(this TvShowCast cast)
    {
        return new CastMember
        {
            Id = cast.Id,
            Name = cast.Name,
            Character = cast.Character,
            Order = cast.Order,
            ProfilePath = cast.ProfilePath
        };
    }
}
