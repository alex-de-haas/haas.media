using System;
using System.Collections.Generic;
using System.Linq;
using Haas.Media.Core.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class AddToLibraryTaskExecutor
    : IBackgroundTaskExecutor<AddToLibraryTask, AddToLibraryOperationInfo>
{
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<FileMetadata> _fileMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<AddToLibraryTaskExecutor> _logger;
    private readonly ITmdbLanguageProvider _languageProvider;
    private readonly ITmdbCountryProvider _countryProvider;

    public AddToLibraryTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        ILogger<AddToLibraryTaskExecutor> logger,
        ITmdbLanguageProvider languageProvider,
        ITmdbCountryProvider countryProvider
    )
    {
        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _fileMetadataCollection = database.GetCollection<FileMetadata>("fileMetadata");
        _personMetadataCollection = database.GetCollection<PersonMetadata>("personMetadata");
        _tmdbClient = tmdbClient;
        _logger = logger;
        _languageProvider = languageProvider;
        _countryProvider = countryProvider;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<AddToLibraryTask, AddToLibraryOperationInfo> context
    )
    {
        ApplyPreferredLanguage();

        var task = context.Task;
        context.State.StartedAt ??= DateTimeOffset.UtcNow;

        var payload = new AddToLibraryOperationInfo(
            task.TmdbId,
            task.LibraryId,
            task.LibraryType,
            task.LibraryTitle,
            Stage: "Queued",
            StartTime: DateTime.UtcNow
        );

        context.ReportStatus(BackgroundTaskStatus.Running);

        context.ReportProgress(1);
        context.SetPayload(payload);

        try
        {
            var library = _librariesCollection.FindById(new BsonValue(task.LibraryId));
            if (library is null)
            {
                throw new ArgumentException(
                    $"Library with ID '{task.LibraryId}' not found."
                );
            }

            if (library.Type != task.LibraryType)
            {
                throw new ArgumentException(
                    $"Library type mismatch. Library is {library.Type}, request is {task.LibraryType}."
                );
            }

            payload = payload with
            {
                LibraryTitle = library.Title,
                Stage = "Validating request"
            };
            context.SetPayload(payload);
            context.ReportProgress(5);

            payload = task.LibraryType switch
            {
                LibraryType.Movies => await ProcessMovieAsync(context, library, payload),
                LibraryType.TVShows => await ProcessTvShowAsync(context, library, payload),
                _ => throw new ArgumentException(
                    $"Unsupported library type: {task.LibraryType}"
                ),
            };

            payload = payload with
            {
                Stage = "Completed",
                CompletedTime = DateTime.UtcNow
            };
            context.SetPayload(payload);
            context.ReportProgress(100);
        }
        catch (OperationCanceledException)
        {
            payload = payload with
            {
                Stage = "Cancelled",
                CompletedTime = DateTime.UtcNow
            };
            context.SetPayload(payload);

            _logger.LogInformation(
                "Add-to-library task {TaskId} was cancelled for TMDB {TmdbId}",
                task.Id,
                task.TmdbId
            );

            throw;
        }
        catch (Exception ex)
        {
            payload = payload with
            {
                Stage = "Failed",
                CompletedTime = DateTime.UtcNow
            };
            context.SetPayload(payload);

            _logger.LogError(
                ex,
                "Add-to-library task {TaskId} failed for TMDB {TmdbId}",
                task.Id,
                task.TmdbId
            );

            throw;
        }
    }

    private async Task<AddToLibraryOperationInfo> ProcessMovieAsync(
        BackgroundWorkerContext<AddToLibraryTask, AddToLibraryOperationInfo> context,
        LibraryInfo library,
        AddToLibraryOperationInfo payload
    )
    {
        var cancellationToken = context.CancellationToken;
        var tmdbId = context.Task.TmdbId;

        payload = payload with { Stage = "Fetching movie metadata" };
        context.SetPayload(payload);
        context.ReportProgress(15);

        var movieDetails = await _tmdbClient.GetMovieAsync(
            tmdbId,
            extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits,
            cancellationToken: cancellationToken
        );

        if (movieDetails is null)
        {
            throw new ArgumentException($"Movie with TMDB ID {tmdbId} not found on TMDB.");
        }

        payload = payload with { Stage = "Fetching movie credits" };
        context.SetPayload(payload);
        context.ReportProgress(35);

        var existingMovie = _movieMetadataCollection.FindById(new BsonValue(tmdbId.ToString()));

        var totalPeople = 0;
        var syncedPeople = 0;
        var failedPeople = 0;

        await PersonMetadataSynchronizer.SyncAsync(
            _tmdbClient,
            _personMetadataCollection,
            _logger,
            PersonMetadataCollector.FromCredits(movieDetails.Credits),
            refreshExisting: existingMovie is not null,
            cancellationToken: cancellationToken,
            reportProgress: progress =>
            {
                totalPeople++;

                if (progress.Outcome == PersonSyncOutcome.Failed)
                {
                    failedPeople++;
                }
                else
                {
                    syncedPeople++;
                }

                payload = payload with
                {
                    Stage = "Syncing movie credits",
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                };
                context.SetPayload(payload);
            }
        );

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        MovieMetadata movieMetadata;
        if (existingMovie is not null)
        {
            movieDetails.Update(existingMovie, preferredCountry);

            if (!_movieMetadataCollection.Update(existingMovie))
            {
                _movieMetadataCollection.Upsert(existingMovie);
            }

            _logger.LogInformation(
                "Updated movie '{Title}' (TMDB ID: {TmdbId}) metadata for library {LibraryId}",
                existingMovie.Title,
                tmdbId,
                library.Id
            );

            payload = payload with
            {
                Stage = "Movie metadata updated",
                Title = existingMovie.Title,
                PosterPath = existingMovie.PosterPath,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople
            };
            
            movieMetadata = existingMovie;
        }
        else
        {
            movieMetadata = movieDetails.Create(preferredCountry);
            _movieMetadataCollection.Insert(movieMetadata);

            _logger.LogInformation(
                "Successfully added movie '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}",
                movieMetadata.Title,
                tmdbId,
                library.Id
            );

            payload = payload with
            {
                Stage = "Movie metadata added",
                Title = movieMetadata.Title,
                PosterPath = movieMetadata.PosterPath,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople
            };
        }

        context.SetPayload(payload);
        context.ReportProgress(95);

        return payload;
    }

    private async Task<AddToLibraryOperationInfo> ProcessTvShowAsync(
        BackgroundWorkerContext<AddToLibraryTask, AddToLibraryOperationInfo> context,
        LibraryInfo library,
        AddToLibraryOperationInfo payload
    )
    {
        var cancellationToken = context.CancellationToken;
        var tmdbId = context.Task.TmdbId;

        payload = payload with { Stage = "Fetching TV show metadata" };
        context.SetPayload(payload);
        context.ReportProgress(10);

        var tvShowDetails = await _tmdbClient.GetTvShowAsync(
            tmdbId,
            extraMethods: TvShowMethods.Credits,
            cancellationToken: cancellationToken
        );

        if (tvShowDetails is null)
        {
            throw new ArgumentException($"TV show with TMDB ID {tmdbId} not found on TMDB.");
        }

        var associatedPersonIds = new HashSet<int>();
        associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(tvShowDetails.Credits));
        associatedPersonIds.UnionWith(PersonMetadataCollector.FromCreators(tvShowDetails.CreatedBy));

        payload = payload with { Stage = "Fetching TV show credits" };
        context.SetPayload(payload);
        context.ReportProgress(20);

        var existingTVShow = _tvShowMetadataCollection.FindById(new BsonValue(tmdbId.ToString()));

        var seasons = new List<TVSeasonMetadata>();
        var orderedSeasons = tvShowDetails
            .Seasons?
            .Where(s => s.SeasonNumber > 0)
            .OrderBy(s => s.SeasonNumber)
            .ToArray() ?? Array.Empty<SearchTvSeason>();

        var totalSeasons = orderedSeasons.Length;
        payload = payload with { TotalSeasons = totalSeasons, ProcessedSeasons = 0 };
        context.SetPayload(payload);

        var processedSeasons = 0;
        var processedEpisodes = 0;
        var totalEpisodes = 0;

        foreach (var season in orderedSeasons)
        {
            context.ThrowIfCancellationRequested();

            payload = payload with
            {
                Stage = $"Processing season {season.SeasonNumber}",
                ProcessedSeasons = processedSeasons,
                ProcessedEpisodes = processedEpisodes
            };
            context.SetPayload(payload);

            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                tmdbId,
                season.SeasonNumber,
                cancellationToken: cancellationToken
            );

            var seasonMetadata = seasonDetails.Create();
            var episodes = new List<TVEpisodeMetadata>();

            associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(seasonDetails.Credits));

            totalEpisodes += seasonDetails.Episodes.Count;

            foreach (var episode in seasonDetails.Episodes)
            {
                context.ThrowIfCancellationRequested();

                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbId,
                    season.SeasonNumber,
                    episode.EpisodeNumber,
                    cancellationToken: cancellationToken
                );

                var episodeMetadata = episodeDetails.Create();
                episodes.Add(episodeMetadata);
                processedEpisodes++;

                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(episodeDetails.Credits));
                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCrew(episodeDetails.Crew));
                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCast(episodeDetails.GuestStars));

                var episodeProgress = totalEpisodes > 0
                    ? 20 + Math.Min(80, 80 * (double)processedEpisodes / totalEpisodes)
                    : 20;
                payload = payload with
                {
                    ProcessedEpisodes = processedEpisodes,
                    TotalEpisodes = totalEpisodes
                };
                context.SetPayload(payload);
                context.ReportProgress(Math.Min(99, episodeProgress));
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);

            processedSeasons++;
            payload = payload with
            {
                ProcessedSeasons = processedSeasons,
                TotalSeasons = totalSeasons
            };
            context.SetPayload(payload);

            var seasonProgress = totalSeasons > 0
                ? 20 + Math.Min(80, 80 * (double)processedSeasons / totalSeasons)
                : 20;
            context.ReportProgress(Math.Min(99, seasonProgress));
        }

        var totalPeople = 0;
        var syncedPeople = 0;
        var failedPeople = 0;

        await PersonMetadataSynchronizer.SyncAsync(
            _tmdbClient,
            _personMetadataCollection,
            _logger,
            associatedPersonIds,
            refreshExisting: existingTVShow is not null,
            cancellationToken: cancellationToken,
            reportProgress: progress =>
            {
                totalPeople++;

                if (progress.Outcome == PersonSyncOutcome.Failed)
                {
                    failedPeople++;
                }
                else
                {
                    syncedPeople++;
                }

                payload = payload with
                {
                    Stage = "Syncing TV show credits",
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                };
                context.SetPayload(payload);
            }
        );

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        TVShowMetadata tvShowMetadata;
        if (existingTVShow is not null)
        {
            tvShowDetails.Update(existingTVShow, preferredCountry);
            existingTVShow.Seasons = seasons.ToArray();

            if (!_tvShowMetadataCollection.Update(existingTVShow))
            {
                _tvShowMetadataCollection.Upsert(existingTVShow);
            }

            _logger.LogInformation(
                "Updated TV show '{Title}' (TMDB ID: {TmdbId}) metadata for library {LibraryId}",
                existingTVShow.Title,
                tmdbId,
                library.Id
            );

            payload = payload with
            {
                Stage = "TV show metadata updated",
                Title = existingTVShow.Title,
                PosterPath = existingTVShow.PosterPath,
                ProcessedSeasons = processedSeasons,
                TotalSeasons = totalSeasons,
                ProcessedEpisodes = processedEpisodes,
                TotalEpisodes = totalEpisodes,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople
            };
            
            tvShowMetadata = existingTVShow;
        }
        else
        {
            tvShowMetadata = tvShowDetails.Create(preferredCountry);
            tvShowMetadata.Seasons = seasons.ToArray();
            _tvShowMetadataCollection.Insert(tvShowMetadata);

            _logger.LogInformation(
                "Successfully added TV show '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}",
                tvShowMetadata.Title,
                tmdbId,
                library.Id
            );

            payload = payload with
            {
                Stage = "TV show metadata added",
                Title = tvShowMetadata.Title,
                PosterPath = tvShowMetadata.PosterPath,
                ProcessedSeasons = processedSeasons,
                TotalSeasons = totalSeasons,
                ProcessedEpisodes = processedEpisodes,
                TotalEpisodes = totalEpisodes,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople
            };
        }

        context.SetPayload(payload);
        context.ReportProgress(95);

        return payload;
    }

    private void ApplyPreferredLanguage()
    {
        var language = _languageProvider.GetPreferredLanguage();
        if (!string.IsNullOrWhiteSpace(language))
        {
            _tmdbClient.DefaultLanguage = language;
        }
    }
}
