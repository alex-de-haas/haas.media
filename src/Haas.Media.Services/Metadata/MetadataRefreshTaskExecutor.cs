using Haas.Media.Core.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

internal sealed class MetadataRefreshTaskExecutor
    : IBackgroundTaskExecutor<MetadataRefreshTask, MetadataRefreshOperationInfo>
{
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<MetadataRefreshTaskExecutor> _logger;
    private readonly ITmdbLanguageProvider _languageProvider;
    private readonly ITmdbCountryProvider _countryProvider;

    public MetadataRefreshTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        ILogger<MetadataRefreshTaskExecutor> logger,
        ITmdbLanguageProvider languageProvider,
        ITmdbCountryProvider countryProvider
    )
    {
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _personMetadataCollection = database.GetCollection<PersonMetadata>("personMetadata");
        _tmdbClient = tmdbClient;
        _logger = logger;
        _languageProvider = languageProvider;
        _countryProvider = countryProvider;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<MetadataRefreshTask, MetadataRefreshOperationInfo> context
    )
    {
        ApplyPreferredLanguage();

        var cancellationToken = context.CancellationToken;
        context.State.StartedAt ??= DateTimeOffset.UtcNow;

        var movies = _movieMetadataCollection.FindAll().ToList();
        var tvShows = _tvShowMetadataCollection.FindAll().ToList();
        var totalItems = movies.Count + tvShows.Count;

        var payload = new MetadataRefreshOperationInfo(
            context.Task.Id.ToString(),
            TotalItems: totalItems,
            ProcessedItems: 0,
            TotalMovies: movies.Count,
            ProcessedMovies: 0,
            TotalTvShows: tvShows.Count,
            ProcessedTvShows: 0,
            Stage: "Initializing refresh",
            StartedAt: DateTime.UtcNow
        );

        context.ReportStatus(BackgroundTaskStatus.Running);
        context.ReportProgress(totalItems == 0 ? 100 : 0);
        context.SetPayload(payload);

        var processedItems = 0;
        var processedMovies = 0;
        var processedTvShows = 0;
        var totalPeople = 0;
        var syncedPeople = 0;
        var failedPeople = 0;

        try
        {
            foreach (var movie in movies)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var displayTitle = string.IsNullOrWhiteSpace(movie.Title)
                    ? $"TMDb #{movie.Id}"
                    : movie.Title;

                payload = payload with
                {
                    Stage = "Refreshing movie metadata",
                    CurrentTitle = displayTitle,
                    ProcessedItems = processedItems,
                    ProcessedMovies = processedMovies,
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                    LastError = null,
                };
                context.SetPayload(payload);
                UpdateProgress();

                string? lastError = null;
                var personSyncStats = PersonSyncStatistics.Empty;
                var reportedTotalPeople = 0;
                var reportedSynced = 0;
                var reportedFailed = 0;

                try
                {
                    personSyncStats = await RefreshMovieAsync(
                        movie,
                        cancellationToken,
                        progress =>
                        {
                            if (progress.Outcome == PersonSyncOutcome.Failed)
                            {
                                reportedFailed++;
                                failedPeople++;
                            }
                            else
                            {
                                reportedSynced++;
                                syncedPeople++;
                            }

                            payload = payload with
                            {
                                TotalPeople = totalPeople,
                                SyncedPeople = syncedPeople,
                                FailedPeople = failedPeople,
                            };
                            context.SetPayload(payload);
                            UpdateProgress();
                        },
                        personCount =>
                        {
                            if (personCount <= 0)
                            {
                                return;
                            }

                            reportedTotalPeople += personCount;
                            totalPeople += personCount;

                            payload = payload with
                            {
                                TotalPeople = totalPeople,
                                SyncedPeople = syncedPeople,
                                FailedPeople = failedPeople,
                            };
                            context.SetPayload(payload);
                            UpdateProgress();
                        }
                    );
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    _logger.LogWarning(
                        ex,
                        "Failed to refresh movie metadata for {Title} (TMDb {TmdbId})",
                        displayTitle,
                        movie.Id
                    );
                }

                var hasUnreportedTotals = false;

                if (personSyncStats.Requested > reportedTotalPeople)
                {
                    var deltaRequested = personSyncStats.Requested - reportedTotalPeople;
                    totalPeople += deltaRequested;
                    reportedTotalPeople += deltaRequested;
                    hasUnreportedTotals = true;
                }

                if (personSyncStats.Synced > reportedSynced)
                {
                    var deltaSynced = personSyncStats.Synced - reportedSynced;
                    syncedPeople += deltaSynced;
                    reportedSynced += deltaSynced;
                    hasUnreportedTotals = true;
                }

                if (personSyncStats.Failed > reportedFailed)
                {
                    var deltaFailed = personSyncStats.Failed - reportedFailed;
                    failedPeople += deltaFailed;
                    reportedFailed += deltaFailed;
                    hasUnreportedTotals = true;
                }

                if (hasUnreportedTotals)
                {
                    payload = payload with
                    {
                        TotalPeople = totalPeople,
                        SyncedPeople = syncedPeople,
                        FailedPeople = failedPeople,
                    };
                    context.SetPayload(payload);
                }

                processedMovies++;
                processedItems++;

                payload = payload with
                {
                    ProcessedItems = processedItems,
                    ProcessedMovies = processedMovies,
                    Stage = lastError is null ? "Movie refreshed" : "Movie refresh failed",
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                    LastError = lastError,
                };

                context.SetPayload(payload);
                UpdateProgress();
            }

            foreach (var tvShow in tvShows)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var displayTitle = string.IsNullOrWhiteSpace(tvShow.Title)
                    ? $"TMDb #{tvShow.Id}"
                    : tvShow.Title;

                payload = payload with
                {
                    Stage = "Refreshing TV show metadata",
                    CurrentTitle = displayTitle,
                    ProcessedItems = processedItems,
                    ProcessedTvShows = processedTvShows,
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                    LastError = null,
                };
                context.SetPayload(payload);
                UpdateProgress();

                string? lastError = null;
                var personSyncStats = PersonSyncStatistics.Empty;
                var reportedTotalPeople = 0;
                var reportedSynced = 0;
                var reportedFailed = 0;

                try
                {
                    personSyncStats = await RefreshTvShowAsync(
                        tvShow,
                        cancellationToken,
                        progress =>
                        {
                            if (progress.Outcome == PersonSyncOutcome.Failed)
                            {
                                reportedFailed++;
                                failedPeople++;
                            }
                            else
                            {
                                reportedSynced++;
                                syncedPeople++;
                            }

                            payload = payload with
                            {
                                TotalPeople = totalPeople,
                                SyncedPeople = syncedPeople,
                                FailedPeople = failedPeople,
                            };
                            context.SetPayload(payload);
                            UpdateProgress();
                        },
                        personCount =>
                        {
                            if (personCount <= 0)
                            {
                                return;
                            }

                            reportedTotalPeople += personCount;
                            totalPeople += personCount;

                            payload = payload with
                            {
                                TotalPeople = totalPeople,
                                SyncedPeople = syncedPeople,
                                FailedPeople = failedPeople,
                            };
                            context.SetPayload(payload);
                            UpdateProgress();
                        }
                    );
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    _logger.LogWarning(
                        ex,
                        "Failed to refresh TV show metadata for {Title} (TMDb {TmdbId})",
                        displayTitle,
                        tvShow.Id
                    );
                }

                var hasUnreportedTotals = false;

                if (personSyncStats.Requested > reportedTotalPeople)
                {
                    var deltaRequested = personSyncStats.Requested - reportedTotalPeople;
                    totalPeople += deltaRequested;
                    reportedTotalPeople += deltaRequested;
                    hasUnreportedTotals = true;
                }

                if (personSyncStats.Synced > reportedSynced)
                {
                    var deltaSynced = personSyncStats.Synced - reportedSynced;
                    syncedPeople += deltaSynced;
                    reportedSynced += deltaSynced;
                    hasUnreportedTotals = true;
                }

                if (personSyncStats.Failed > reportedFailed)
                {
                    var deltaFailed = personSyncStats.Failed - reportedFailed;
                    failedPeople += deltaFailed;
                    reportedFailed += deltaFailed;
                    hasUnreportedTotals = true;
                }

                if (hasUnreportedTotals)
                {
                    payload = payload with
                    {
                        TotalPeople = totalPeople,
                        SyncedPeople = syncedPeople,
                        FailedPeople = failedPeople,
                    };
                    context.SetPayload(payload);
                }

                processedTvShows++;
                processedItems++;

                payload = payload with
                {
                    ProcessedItems = processedItems,
                    ProcessedTvShows = processedTvShows,
                    Stage = lastError is null ? "TV show refreshed" : "TV show refresh failed",
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                    LastError = lastError,
                };

                context.SetPayload(payload);
                UpdateProgress();
            }

            payload = payload with
            {
                ProcessedItems = processedItems,
                ProcessedMovies = processedMovies,
                ProcessedTvShows = processedTvShows,
                Stage = "Refresh completed",
                CurrentTitle = null,
                LastError = null,
                CompletedAt = DateTime.UtcNow,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople,
            };

            context.SetPayload(payload);
            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);
        }
        catch (OperationCanceledException)
        {
            payload = payload with { Stage = "Refresh cancelled", CompletedAt = DateTime.UtcNow, };
            context.SetPayload(payload);
            context.ReportStatus(BackgroundTaskStatus.Cancelled);

            throw;
        }
        catch (Exception ex)
        {
            payload = payload with
            {
                Stage = "Refresh failed",
                CompletedAt = DateTime.UtcNow,
                LastError = ex.Message,
            };
            context.SetPayload(payload);
            context.ReportStatus(BackgroundTaskStatus.Failed);

            _logger.LogError(ex, "Metadata refresh task failed unexpectedly");

            throw;
        }

        void UpdateProgress()
        {
            var progress = MetadataProgressCalculator.Calculate(
                processedItems,
                totalItems,
                syncedPeople,
                totalPeople
            );
            context.ReportProgress(progress);
        }
    }

    private void ApplyPreferredLanguage()
    {
        var language = _languageProvider.GetPreferredLanguage();
        if (!string.IsNullOrWhiteSpace(language))
        {
            _tmdbClient.DefaultLanguage = language;
        }
    }

    private async Task<PersonSyncStatistics> RefreshMovieAsync(
        MovieMetadata movie,
        CancellationToken cancellationToken,
        Action<PersonSyncProgress>? reportProgress = null,
        Action<int>? reportPersonCount = null
    )
    {
        var tmdbId = movie.Id;
        var movieDetails = await _tmdbClient.GetMovieAsync(
            tmdbId,
            extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits | MovieMethods.Images,
            cancellationToken: cancellationToken
        );

        if (movieDetails is null)
        {
            throw new InvalidOperationException(
                $"Movie with TMDb ID {tmdbId} was not found."
            );
        }

        var associatedPersonIds = PersonMetadataCollector
            .FromCredits(movieDetails.Credits)
            .Distinct()
            .ToArray();

        if (associatedPersonIds.Length > 0)
        {
            reportPersonCount?.Invoke(associatedPersonIds.Length);
        }

        var personSyncStats = await PersonMetadataSynchronizer.SyncAsync(
            _tmdbClient,
            _personMetadataCollection,
            _logger,
            associatedPersonIds,
            refreshExisting: true,
            cancellationToken: cancellationToken,
            reportProgress: reportProgress
        );

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        movieDetails.Update(movie, preferredCountry, preferredLanguage);

        _movieMetadataCollection.Update(movie);

        return personSyncStats;
    }

    private async Task<PersonSyncStatistics> RefreshTvShowAsync(
        TVShowMetadata tvShow,
        CancellationToken cancellationToken,
        Action<PersonSyncProgress>? reportProgress = null,
        Action<int>? reportPersonCount = null
    )
    {
        var tmdbId = tvShow.Id;
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(
            tmdbId,
            extraMethods: TvShowMethods.Credits | TvShowMethods.Images,
            cancellationToken: cancellationToken
        );

        if (tvShowDetails is null)
        {
            throw new InvalidOperationException(
                $"TV show with TMDb ID {tmdbId} was not found."
            );
        }

        var associatedPersonIds = new HashSet<int>();
        associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(tvShowDetails.Credits));
        associatedPersonIds.UnionWith(PersonMetadataCollector.FromCreators(tvShowDetails.CreatedBy));

        var orderedSeasons =
            tvShowDetails
                .Seasons?.Where(season => season.SeasonNumber > 0)
                .OrderBy(season => season.SeasonNumber)
                .ToArray() ?? Array.Empty<SearchTvSeason>();

        var seasons = new List<TVSeasonMetadata>();

        foreach (var season in orderedSeasons)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                tmdbId,
                season.SeasonNumber,
                cancellationToken: cancellationToken
            );

            associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(seasonDetails.Credits));

            var seasonMetadata = seasonDetails.Create();
            var episodes = new List<TVEpisodeMetadata>();

            foreach (var episode in seasonDetails.Episodes)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbId,
                    season.SeasonNumber,
                    episode.EpisodeNumber,
                    cancellationToken: cancellationToken
                );

                if (episodeDetails is null)
                {
                    continue;
                }

                var episodeMetadata = episodeDetails.Create();
                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(episodeDetails.Credits));
                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCrew(episodeDetails.Crew));
                associatedPersonIds.UnionWith(PersonMetadataCollector.FromCast(episodeDetails.GuestStars));
                episodes.Add(episodeMetadata);
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);
        }

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        tvShowDetails.Update(tvShow, preferredCountry, preferredLanguage);

        tvShow.Seasons = seasons.ToArray();

        if (associatedPersonIds.Count > 0)
        {
            reportPersonCount?.Invoke(associatedPersonIds.Count);
        }

        var personSyncStats = await PersonMetadataSynchronizer.SyncAsync(
            _tmdbClient,
            _personMetadataCollection,
            _logger,
            associatedPersonIds,
            refreshExisting: true,
            cancellationToken: cancellationToken,
            reportProgress: reportProgress
        );

        _tvShowMetadataCollection.Update(tvShow);

        return personSyncStats;
    }
}
