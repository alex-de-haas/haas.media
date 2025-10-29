using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class MetadataSyncTask : BackgroundTaskBase
{
    public MetadataSyncTask(Guid? id = null)
        : base(id) { }

    /// <summary>
    /// Whether to refresh metadata from TMDb for existing movies, TV shows, and people.
    /// When false, only new items are added to the library.
    /// </summary>
    public bool RefreshExistingData { get; init; } = true;

    public override string Name => "Metadata sync";
}
