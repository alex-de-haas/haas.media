using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public sealed class AddToLibraryTask : BackgroundTaskBase
{
    public AddToLibraryTask(string libraryId, LibraryType libraryType, int tmdbId, string? libraryTitle = null)
    {
        LibraryId = libraryId;
        LibraryType = libraryType;
        TmdbId = tmdbId;
        LibraryTitle = libraryTitle;
    }

    public override string Name => "Add metadata to library";

    public string LibraryId { get; }

    public LibraryType LibraryType { get; }

    public int TmdbId { get; }

    public string? LibraryTitle { get; }
}
