using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class MetadataScanTask : BackgroundTaskBase
{
    public override string Name => "Metadata library scan";
}
