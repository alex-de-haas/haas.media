namespace Haas.Media.Downloader.Api.Files;

public record FileItem(string Name, string? Extension, string RelativePath, long? Size, DateTimeOffset LastModified, bool IsDirectory);
