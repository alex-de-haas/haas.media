using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Nodes;

public sealed class NodeFileDownloadTask : BackgroundTaskBase
{
    public NodeFileDownloadTask(
        string nodeId,
        string remoteFilePath,
        string libraryId
    )
        : base()
    {
        NodeId = nodeId;
        RemoteFilePath = remoteFilePath;
        LibraryId = libraryId;
    }

    public override string Name => "Node file download";

    public string NodeId { get; }
    public string RemoteFilePath { get; }
    public string LibraryId { get; }
}
