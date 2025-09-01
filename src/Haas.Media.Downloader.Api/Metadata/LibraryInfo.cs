using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Haas.Media.Downloader.Api.Metadata;

public enum LibraryType
{
    Movies = 1,
    TVShows = 2,
}

public class LibraryInfo
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }
    
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; } // Path to directory with media files
    public required string Title { get; set; }
    public string? Description { get; set; }
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
