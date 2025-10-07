using System;
using System.Collections.Generic;
using System.Linq;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using Microsoft.Extensions.Logging;
using TMDbLib.Client;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class MetadataRefreshTaskExecutor
    : IBackgroundTaskExecutor<MetadataRefreshTask, MetadataRefreshOperationInfo>
{
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<MetadataRefreshTaskExecutor> _logger;

    public MetadataRefreshTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        ILogger<MetadataRefreshTaskExecutor> logger
    )
    {
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _tmdbClient = tmdbClient;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<MetadataRefreshTask, MetadataRefreshOperationInfo> context
    )
    {
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
                    LastError = null,
                };
                context.SetPayload(payload);

                string? lastError = null;

                try
                {
                    await RefreshMovieAsync(movie, cancellationToken);
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

                processedMovies++;
                processedItems++;

                var progress =
                    totalItems > 0
                        ? (double)processedItems / Math.Max(1, totalItems) * 100.0
                        : 100.0;

                payload = payload with
                {
                    ProcessedItems = processedItems,
                    ProcessedMovies = processedMovies,
                    Stage = lastError is null ? "Movie refreshed" : "Movie refresh failed",
                    LastError = lastError,
                };

                context.SetPayload(payload);
                context.ReportProgress(Math.Min(progress, 99.0));

                await Task.Delay(TimeSpan.FromMilliseconds(250), cancellationToken);
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
                    LastError = null,
                };
                context.SetPayload(payload);

                string? lastError = null;

                try
                {
                    await RefreshTvShowAsync(tvShow, cancellationToken);
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

                processedTvShows++;
                processedItems++;

                var progress =
                    totalItems > 0
                        ? (double)processedItems / Math.Max(1, totalItems) * 100.0
                        : 100.0;

                payload = payload with
                {
                    ProcessedItems = processedItems,
                    ProcessedTvShows = processedTvShows,
                    Stage = lastError is null ? "TV show refreshed" : "TV show refresh failed",
                    LastError = lastError,
                };

                context.SetPayload(payload);
                context.ReportProgress(Math.Min(progress, 99.5));

                await Task.Delay(TimeSpan.FromMilliseconds(250), cancellationToken);
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
    }

    private async Task RefreshMovieAsync(MovieMetadata movie, CancellationToken cancellationToken)
    {
        var tmdbId =movie.Id;
        var movieDetails = await _tmdbClient.GetMovieAsync(
            tmdbId,
            extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits,
            cancellationToken: cancellationToken
        );

        if (movieDetails is null)
        {
            throw new InvalidOperationException(
                $"Movie with TMDb ID {tmdbId} was not found."
            );
        }

        movieDetails.Update(movie);

        _movieMetadataCollection.Update(movie);
    }

    private async Task RefreshTvShowAsync(
        TVShowMetadata tvShow,
        CancellationToken cancellationToken
    )
    {
        var tmdbId = tvShow.Id;
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(
            tmdbId,
            extraMethods: TvShowMethods.Credits,
            cancellationToken: cancellationToken
        );

        if (tvShowDetails is null)
        {
            throw new InvalidOperationException(
                $"TV show with TMDb ID {tmdbId} was not found."
            );
        }

        var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(
            tmdbId,
            cancellationToken: cancellationToken
        );

        var existingEpisodeLookup = tvShow
            .Seasons?.SelectMany(
                season => season.Episodes ?? Array.Empty<TVEpisodeMetadata>(),
                (season, episode) =>
                    new
                    {
                        season.SeasonNumber,
                        episode.EpisodeNumber,
                        episode.FilePath,
                    }
            )
            .ToDictionary(x => (x.SeasonNumber, x.EpisodeNumber), x => x.FilePath);

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

                if (
                    existingEpisodeLookup?.TryGetValue(
                        (episodeMetadata.SeasonNumber, episodeMetadata.EpisodeNumber),
                        out var filePath
                    ) == true
                )
                {
                    episodeMetadata.FilePath = filePath;
                }

                episodes.Add(episodeMetadata);

                await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);

            await Task.Delay(TimeSpan.FromMilliseconds(100), cancellationToken);
        }

        tvShowDetails.Update(tvShow);

        tvShow.Seasons = seasons.ToArray();

        _tvShowMetadataCollection.Update(tvShow);
    }
}
