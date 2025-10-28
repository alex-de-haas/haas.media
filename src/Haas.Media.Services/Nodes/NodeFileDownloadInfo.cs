namespace Haas.Media.Services.Nodes;

public sealed record NodeFileDownloadInfo(
    string TaskId,
    string NodeId,
    string NodeName,
    string RemoteFilePath,
    string DestinationDirectory,
    long TotalBytes,
    long DownloadedBytes,
    DateTime StartTime,
    DateTime? CompletedTime,
    string? LocalFilePath,
    string? ExpectedMd5Hash,
    string? ActualMd5Hash,
    bool? HashValidated
);
