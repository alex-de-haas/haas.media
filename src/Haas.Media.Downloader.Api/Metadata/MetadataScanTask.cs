using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public sealed class MetadataScanTask : BackgroundTaskBase
{
    public override string Name => "Metadata library scan";
}
