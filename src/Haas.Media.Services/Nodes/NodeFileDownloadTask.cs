using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Nodes;

public sealed class NodeFileDownloadTask : BackgroundTaskBase
{
    public NodeFileDownloadTask(
        string nodeId,
        string remoteFilePath,
        string destinationDirectory,
        string? customFileName = null
    )
        : base()
    {
        NodeId = nodeId;
        RemoteFilePath = remoteFilePath;
        DestinationDirectory = destinationDirectory;
        CustomFileName = customFileName;
    }

    public override string Name => "Node file download";

    public string NodeId { get; }
    public string RemoteFilePath { get; }
    public string DestinationDirectory { get; }
    public string? CustomFileName { get; }
}
