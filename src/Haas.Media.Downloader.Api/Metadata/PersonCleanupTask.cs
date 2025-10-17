using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public sealed class PersonCleanupTask : BackgroundTaskBase
{
    public override string Name => "Person metadata cleanup";
    public required int[] PersonIds { get; init; }
}
