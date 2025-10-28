using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Nodes;

public sealed class NodeFileDownloadTask : BackgroundTaskBase
{
    public NodeFileDownloadTask(
        string nodeId,
        string remoteFilePath,
        string destinationDirectory
    )
        : base()
    {
        NodeId = nodeId;
        RemoteFilePath = remoteFilePath;
        DestinationDirectory = destinationDirectory;
    }

    public override string Name => "Node file download";

    public string NodeId { get; }
    public string RemoteFilePath { get; }
    public string DestinationDirectory { get; }
}
