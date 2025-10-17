using Haas.Media.Core.BackgroundTasks;
using LiteDB;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class PersonCleanupTaskExecutor
    : IBackgroundTaskExecutor<PersonCleanupTask, PersonCleanupOperationInfo>
{
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly ILogger<PersonCleanupTaskExecutor> _logger;

    public PersonCleanupTaskExecutor(
        LiteDatabase database,
        ILogger<PersonCleanupTaskExecutor> logger
    )
    {
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _personMetadataCollection = database.GetCollection<PersonMetadata>("personMetadata");
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<PersonCleanupTask, PersonCleanupOperationInfo> context
    )
    {
        var personIds = context.Task.PersonIds;
        if (personIds == null || personIds.Length == 0)
        {
            _logger.LogInformation("No person IDs provided for cleanup");
            context.ReportStatus(BackgroundTaskStatus.Completed);
            return;
        }

        var totalPeople = personIds.Length;
        var checkedPeople = 0;
        var deletedPeople = 0;

        _logger.LogInformation("Starting person metadata cleanup for {Count} people", totalPeople);

        var payload = new PersonCleanupOperationInfo
        {
            TotalPeople = totalPeople,
            Stage = "Starting cleanup",
            StartedAt = DateTime.UtcNow
        };
        context.SetPayload(payload);
        context.ReportProgress(0);

        foreach (var personId in personIds)
        {
            await Task.Yield(); // Allow other tasks to run
            context.CancellationToken.ThrowIfCancellationRequested();

            // Check if this person is referenced in any remaining movies
            var isInMovies = _movieMetadataCollection
                .FindAll()
                .Any(movie =>
                    movie.Cast.Any(cast => cast.Id == personId)
                    || movie.Crew.Any(crew => crew.Id == personId)
                );

            if (isInMovies)
            {
                checkedPeople++;
                var progress = checkedPeople / (double)totalPeople * 100;
                context.ReportProgress(progress);
                continue; // Person is still referenced, skip deletion
            }

            // Check if this person is referenced in any remaining TV shows
            var isInTVShows = _tvShowMetadataCollection
                .FindAll()
                .Any(tvShow =>
                    tvShow.Cast.Any(cast => cast.Id == personId)
                    || tvShow.Crew.Any(crew => crew.Id == personId)
                    || tvShow.Seasons.Any(season =>
                        season.Episodes.Any(episode =>
                            episode.Cast.Any(cast => cast.Id == personId)
                            || episode.Crew.Any(crew => crew.Id == personId)
                        )
                    )
                );

            if (isInTVShows)
            {
                checkedPeople++;
                var progress = (int)((checkedPeople / (double)totalPeople) * 100);
                context.ReportProgress(progress);
                continue; // Person is still referenced, skip deletion
            }

            // Person is orphaned, delete it
            var deleted = _personMetadataCollection.Delete(new BsonValue(personId));
            if (deleted)
            {
                deletedPeople++;
                _logger.LogDebug("Deleted orphaned person metadata with ID: {PersonId}", personId);
            }

            checkedPeople++;
            var finalProgress = (int)((checkedPeople / (double)totalPeople) * 100);

            context.SetPayload(
                payload with
                {
                    CheckedPeople = checkedPeople,
                    DeletedPeople = deletedPeople
                }
            );
            context.ReportProgress(finalProgress);
        }

        _logger.LogInformation(
            "Person metadata cleanup completed: checked {Checked}, deleted {Deleted} orphaned record(s)",
            checkedPeople,
            deletedPeople
        );

        context.SetPayload(
            payload with
            {
                CheckedPeople = checkedPeople,
                DeletedPeople = deletedPeople,
                Stage = "Cleanup completed",
                CompletedAt = DateTime.UtcNow
            }
        );

        context.ReportStatus(BackgroundTaskStatus.Completed);
    }
}
