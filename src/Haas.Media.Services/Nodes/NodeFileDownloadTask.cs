using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Nodes;

public sealed class NodeFileDownloadTask : BackgroundTaskBase
{
    public NodeFileDownloadTask(
        string nodeId,
        string remoteFilePath,
        string destinationDirectory,
        string? customFileName = null,
        string? tvShowTitle = null,
        int? seasonNumber = null
    )
        : base()
    {
        NodeId = nodeId;
        RemoteFilePath = remoteFilePath;
        DestinationDirectory = destinationDirectory;
        CustomFileName = customFileName;
        TvShowTitle = tvShowTitle;
        SeasonNumber = seasonNumber;
    }

    public override string Name => "Node file download";

    public string NodeId { get; }
    public string RemoteFilePath { get; }
    public string DestinationDirectory { get; }
    public string? CustomFileName { get; }
    public string? TvShowTitle { get; }
    public int? SeasonNumber { get; }
}
