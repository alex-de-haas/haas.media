using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class MetadataRefreshTask : BackgroundTaskBase
{
    public MetadataRefreshTask(Guid? id = null)
        : base(id) { }

    public bool RefreshMovies { get; init; } = true;
    public bool RefreshTvShows { get; init; } = true;
    public bool RefreshPeople { get; init; } = true;

    public override string Name => "Metadata refresh";
}
