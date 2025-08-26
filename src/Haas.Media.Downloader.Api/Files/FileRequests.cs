namespace Haas.Media.Downloader.Api.Files;

public record CopyFileRequest
{
    public required string SourcePath { get; init; }
    public required string DestinationPath { get; init; }
    public bool Overwrite { get; init; } = false;
}

public record MoveFileRequest
{
    public required string SourcePath { get; init; }
    public required string DestinationPath { get; init; }
    public bool Overwrite { get; init; } = false;
}

public record DeleteRequest
{
    public required string Path { get; init; }
}

public record CreateDirectoryRequest
{
    public required string Path { get; init; }
}
