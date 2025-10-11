using LiteDB;
using TMDbLib.Objects.People;

namespace Haas.Media.Downloader.Api.Metadata;

public class PersonMetadata
{
    [BsonId]
    public required int Id { get; set; }

    public string? Biography { get; set; }

    public DateTime? Birthday { get; set; }

    public DateTime? Deathday { get; set; }

    public PersonGender Gender { get; set; }

    public string? Name { get; set; }

    public string? PlaceOfBirth { get; set; }

    public double Popularity { get; set; }

    public string? ProfilePath { get; set; }

    public required DateTime CreatedAt { get; set; }

    public required DateTime UpdatedAt { get; set; }
}

static class PersonMetadataMapper
{
    public static PersonMetadata Create(this Person source)
    {
        return new PersonMetadata
        {
            Id = source.Id,
            Biography = NormalizeWhitespace(source.Biography),
            Birthday = source.Birthday,
            Deathday = source.Deathday,
            Gender = source.Gender,
            Name = NormalizeWhitespace(source.Name),
            PlaceOfBirth = NormalizeWhitespace(source.PlaceOfBirth),
            Popularity = source.Popularity,
            ProfilePath = source.ProfilePath,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    public static void Update(this Person source, PersonMetadata target)
    {
        target.Biography = NormalizeWhitespace(source.Biography);
        target.Birthday = source.Birthday;
        target.Deathday = source.Deathday;
        target.Gender = source.Gender;
        target.Name = NormalizeWhitespace(source.Name);
        target.PlaceOfBirth = NormalizeWhitespace(source.PlaceOfBirth);
        target.Popularity = source.Popularity;
        target.ProfilePath = source.ProfilePath;
        target.UpdatedAt = DateTime.UtcNow;
    }

    private static string? NormalizeWhitespace(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }
}
