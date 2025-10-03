using System;
using System.Collections.Generic;
using System.Linq;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class AddToLibraryTaskExecutor
    : IBackgroundTaskExecutor<AddToLibraryTask, AddToLibraryOperationInfo>
{
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<AddToLibraryTaskExecutor> _logger;

    public AddToLibraryTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        ILogger<AddToLibraryTaskExecutor> logger
    )
    {
        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _tmdbClient = tmdbClient;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<AddToLibraryTask, AddToLibraryOperationInfo> context
    )
    {
        var task = context.Task;
        context.State.StartedAt ??= DateTimeOffset.UtcNow;

        var payload = new AddToLibraryOperationInfo(
            task.Id.ToString(),
            task.LibraryId,
            task.LibraryType,
            task.LibraryTitle,
            task.TmdbId,
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
            cancellationToken: cancellationToken
        );

        if (movieDetails is null)
        {
            throw new ArgumentException($"Movie with TMDB ID {tmdbId} not found on TMDB.");
        }

        payload = payload with { Stage = "Fetching movie credits" };
        context.SetPayload(payload);
        context.ReportProgress(35);

        var movieCredits = await _tmdbClient.GetMovieCreditsAsync(
            tmdbId,
            cancellationToken: cancellationToken
        );

        var crew = movieCredits?.Crew?.Select(c => c.Map()).ToArray() ?? Array.Empty<CrewMember>();
        var cast = movieCredits?.Cast?.Select(c => c.Map()).ToArray() ?? Array.Empty<CastMember>();

        var existingMovie = _movieMetadataCollection.FindOne(m =>
            m.LibraryId == library.Id && m.TmdbId == tmdbId
        );

        if (existingMovie is not null)
        {
            movieDetails.Update(existingMovie);

            existingMovie.Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? [];
            existingMovie.Crew = crew;
            existingMovie.Cast = cast;
            existingMovie.LibraryId = library.Id;
            existingMovie.UpdatedAt = DateTime.UtcNow;

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
                PosterPath = existingMovie.PosterPath
            };
        }
        else
        {
            var movieMetadata = movieDetails.Create(ObjectId.NewObjectId().ToString());

            movieMetadata.Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? [];
            movieMetadata.Crew = crew;
            movieMetadata.Cast = cast;

            movieMetadata.LibraryId = library.Id;
            movieMetadata.CreatedAt = DateTime.UtcNow;
            movieMetadata.UpdatedAt = DateTime.UtcNow;

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
                PosterPath = movieMetadata.PosterPath
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
            cancellationToken: cancellationToken
        );

        if (tvShowDetails is null)
        {
            throw new ArgumentException($"TV show with TMDB ID {tmdbId} not found on TMDB.");
        }

        payload = payload with { Stage = "Fetching TV show credits" };
        context.SetPayload(payload);
        context.ReportProgress(20);

        var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(
            tmdbId,
            cancellationToken: cancellationToken
        );

        var crew = tvShowCredits?.Crew?.Select(c => c.Map()).ToArray() ?? [];
        var cast = tvShowCredits?.Cast?.Select(c => c.Map()).ToArray() ?? [];
        var genres = tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>();
        var networks =
            tvShowDetails.Networks?.Select(n => n.Map()).ToArray() ?? Array.Empty<Network>();

        var existingTVShow = _tvShowMetadataCollection.FindOne(tv =>
            tv.LibraryId == library.Id && tv.TmdbId == tmdbId
        );

        Dictionary<(int SeasonNumber, int EpisodeNumber), string?>? existingEpisodeLookup =
            existingTVShow
                ?.Seasons?
                .SelectMany(season =>
                    season.Episodes.Select(episode => new
                    {
                        season.SeasonNumber,
                        episode.EpisodeNumber,
                        episode.FilePath,
                    })
                )
                .ToDictionary(
                    keySelector => (keySelector.SeasonNumber, keySelector.EpisodeNumber),
                    elementSelector => elementSelector.FilePath
                );

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
                episodeMetadata.FilePath = null;

                if (
                    existingEpisodeLookup?.TryGetValue(
                        (season.SeasonNumber, episode.EpisodeNumber),
                        out var existingFilePath
                    ) == true
                )
                {
                    episodeMetadata.FilePath = existingFilePath;
                }

                episodes.Add(episodeMetadata);
                processedEpisodes++;

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

        if (existingTVShow is not null)
        {
            tvShowDetails.Update(existingTVShow);

            existingTVShow.Genres = genres;
            existingTVShow.Networks = networks;
            existingTVShow.Crew = crew;
            existingTVShow.Cast = cast;
            existingTVShow.Seasons = seasons.ToArray();
            existingTVShow.LibraryId = library.Id;
            existingTVShow.UpdatedAt = DateTime.UtcNow;

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
                TotalEpisodes = totalEpisodes
            };
        }
        else
        {
            var tvShowMetadata = tvShowDetails.Create(ObjectId.NewObjectId().ToString());

            tvShowMetadata.LibraryId = library.Id;
            tvShowMetadata.Genres = genres;
            tvShowMetadata.Networks = networks;
            tvShowMetadata.CreatedAt = DateTime.UtcNow;
            tvShowMetadata.UpdatedAt = DateTime.UtcNow;
            tvShowMetadata.Crew = crew;
            tvShowMetadata.Cast = cast;
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
                TotalEpisodes = totalEpisodes
            };
        }

        context.SetPayload(payload);
        context.ReportProgress(95);

        return payload;
    }
}
