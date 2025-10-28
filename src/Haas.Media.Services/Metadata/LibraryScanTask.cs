using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class LibraryScanTask : BackgroundTaskBase
{
    public LibraryScanTask(Guid? id = null)
        : base(id) { }

    /// <summary>
    /// Whether to scan for new files in libraries
    /// </summary>
    public bool ScanForNewFiles { get; init; } = true;

    /// <summary>
    /// Whether to update file metadata for existing files
    /// </summary>
    public bool UpdateFileMetadata { get; init; } = false;

    /// <summary>
    /// Whether to refresh movie metadata from TMDb
    /// </summary>
    public bool UpdateMovies { get; init; } = false;

    /// <summary>
    /// Whether to refresh TV show metadata from TMDb
    /// </summary>
    public bool UpdateTvShows { get; init; } = false;

    /// <summary>
    /// Whether to refresh people metadata from TMDb
    /// </summary>
    public bool UpdatePeople { get; init; } = false;

    public override string Name => "Library scan";
}
