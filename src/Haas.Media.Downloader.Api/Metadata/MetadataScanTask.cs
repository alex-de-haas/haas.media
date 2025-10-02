using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public sealed class MetadataScanTask : BackgroundTaskBase
{
    public MetadataScanTask(bool refreshExisting, Guid? id = null)
        : base(id) => RefreshExisting = refreshExisting;

    public override string Name => "Metadata library scan";

    public bool RefreshExisting { get; }
}
