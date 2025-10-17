namespace Haas.Media.Services.Metadata;

public class ReleaseDate
{
    public required ReleaseDateType Type { get; set; }
    public required DateTime Date { get; set; }
    public string? CountryCode { get; set; }
}

public enum ReleaseDateType
{
    Theatrical,
    TheatricalLimited,
    Digital,
    Physical,
    Tv,
    Premiere
}
