namespace Haas.Media.Services.Nodes;

public sealed record NodeFileDownloadInfo(
    string TaskId,
    string NodeId,
    string NodeName,
    string RemoteFilePath,
    string LibraryId,
    long TotalBytes,
    long DownloadedBytes,
    DateTime StartTime,
    DateTime? CompletedTime,
    string? LocalFilePath
);
