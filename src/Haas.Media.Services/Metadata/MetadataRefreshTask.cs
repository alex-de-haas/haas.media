using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class MetadataRefreshTask : BackgroundTaskBase
{
    public MetadataRefreshTask(Guid? id = null)
        : base(id) { }

    public override string Name => "Metadata refresh";
}
