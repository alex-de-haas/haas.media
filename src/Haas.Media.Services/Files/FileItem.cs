namespace Haas.Media.Services.Files;

public enum FileItemType
{
    Directory = 1,
    Media = 2,
    Other = 3,
}

public record FileItem(
    string Name,
    string? Extension,
    string RelativePath,
    long? Size,
    DateTimeOffset LastModified,
    FileItemType Type
);
