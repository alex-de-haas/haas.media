using Haas.Media.Core;

namespace Haas.Media.Downloader.Api.Convert;

public record MediaFileInfo
{
    public required string Name { get; init; }
    public required string RelativePath { get; init; }
    public required long Size { get; init; }
    public required DateTimeOffset LastModified { get; init; }
    public required string Extension { get; init; }
    public MediaInfo? MediaInfo { get; set; }
}