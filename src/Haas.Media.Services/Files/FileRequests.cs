namespace Haas.Media.Services.Files;

public record CopyRequest
{
    public required string SourcePath { get; init; }
    public required string DestinationPath { get; init; }
    public bool Overwrite { get; init; } = false;
}

public record MoveRequest
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

public record RenameRequest
{
    public required string Path { get; init; }
    public required string NewName { get; init; }
}
