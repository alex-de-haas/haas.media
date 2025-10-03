using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public sealed class MetadataRefreshTask : BackgroundTaskBase
{
    public MetadataRefreshTask(Guid? id = null)
        : base(id) { }

    public override string Name => "Metadata refresh";
}
