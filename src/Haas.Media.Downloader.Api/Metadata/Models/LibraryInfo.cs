using LiteDB;

namespace Haas.Media.Downloader.Api.Metadata;

public class LibraryInfo
{
    [BsonId]
    public string? Id { get; set; }
    
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; } // Path to directory with media files
    public required string Title { get; set; }
    public string? Description { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
