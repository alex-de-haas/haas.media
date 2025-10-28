using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class MetadataSyncTask : BackgroundTaskBase
{
    public MetadataSyncTask(Guid? id = null)
        : base(id) { }

    /// <summary>
    /// IDs of libraries to sync. If empty or null, all libraries will be synced.
    /// </summary>
    public List<string> LibraryIds { get; init; } = new();

    /// <summary>
    /// Whether to refresh movie metadata from TMDb for new and existing movies
    /// </summary>
    public bool RefreshMovies { get; init; } = true;

    /// <summary>
    /// Whether to refresh TV show metadata from TMDb for new and existing shows
    /// </summary>
    public bool RefreshTvShows { get; init; } = true;

    /// <summary>
    /// Whether to refresh people metadata from TMDb for new and existing people
    /// </summary>
    public bool RefreshPeople { get; init; } = true;

    public override string Name => "Metadata sync";
}
