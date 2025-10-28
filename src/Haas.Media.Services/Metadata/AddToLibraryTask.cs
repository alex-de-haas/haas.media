using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

public sealed class AddToLibraryTask : BackgroundTaskBase
{
    public AddToLibraryTask(LibraryType libraryType, int tmdbId)
    {
        LibraryType = libraryType;
        TmdbId = tmdbId;
    }

    public override string Name => "Add metadata to library";

    public LibraryType LibraryType { get; }

    public int TmdbId { get; }
}
