using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;
using TMDbLib.Client;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class MetadataScanTaskExecutor
{
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly IHubContext<MetadataHub> _hubContext;
    private readonly ILogger _logger;

    public MetadataScanTaskExecutor(
        string dataPath,
        ILiteCollection<LibraryInfo> librariesCollection,
        ILiteCollection<MovieMetadata> movieMetadataCollection,
        ILiteCollection<TVShowMetadata> tvShowMetadataCollection,
        TMDbClient tmdbClient,
        IHubContext<MetadataHub> hubContext,
        ILogger logger
    )
    {
        _dataPath = dataPath;
        _librariesCollection = librariesCollection;
        _movieMetadataCollection = movieMetadataCollection;
        _tvShowMetadataCollection = tvShowMetadataCollection;
        _tmdbClient = tmdbClient;
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundTaskContext taskContext,
        bool refreshExisting,
        ScanOperationInfo initialOperation
    )
    {
        var currentOperation = initialOperation;
        var operationId = currentOperation.Id;
        var cancellationToken = taskContext.CancellationToken;

        taskContext.SetPayload(currentOperation);
        await BroadcastScanOperationAsync(currentOperation, cancellationToken);

        try
        {
            _logger.LogInformation(
                "Starting background metadata scan operation: {OperationId}",
                operationId
            );
            taskContext.ReportStatus("Preparing library scan", currentOperation);

            var libraries = await GetLibrariesAsync();
            var allFiles = new List<(LibraryInfo library, List<string> files)>();
            var totalFiles = 0;

            foreach (var library in libraries)
            {
                taskContext.ThrowIfCancellationRequested();

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);
                if (!Directory.Exists(fullDirectoryPath))
                {
                    _logger.LogWarning(
                        "Library directory does not exist: {DirectoryPath}",
                        fullDirectoryPath
                    );
                    continue;
                }

                var files = ScanDirectoryForMediaFiles(fullDirectoryPath);
                allFiles.Add((library, files));
                totalFiles += files.Count;
            }

            currentOperation = currentOperation with { TotalFiles = totalFiles };
            taskContext.SetPayload(currentOperation);
            await BroadcastScanOperationAsync(currentOperation, cancellationToken);

            var processedFiles = 0;
            var foundMetadata = 0;

            foreach (var (library, files) in allFiles)
            {
                taskContext.ThrowIfCancellationRequested();

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);

                currentOperation = currentOperation with
                {
                    LibraryPath = library.DirectoryPath,
                    LibraryTitle = library.Title,
                    CurrentFile = $"Scanning {library.Title}...",
                };
                taskContext.SetPayload(currentOperation);
                taskContext.ReportStatus($"Scanning {library.Title}", currentOperation);
                await BroadcastScanOperationAsync(currentOperation, cancellationToken);

                int libraryProcessed;
                int libraryFound;

                if (library.Type == LibraryType.Movies)
                {
                    (
                        libraryProcessed,
                        libraryFound,
                        currentOperation
                    ) = await ScanMovieLibraryWithProgressAsync(
                        currentOperation,
                        taskContext,
                        library,
                        fullDirectoryPath,
                        refreshExisting,
                        processedFiles,
                        totalFiles
                    );
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    (libraryProcessed, libraryFound) = await ScanTVShowLibraryAsync(
                        library,
                        fullDirectoryPath,
                        refreshExisting,
                        cancellationToken
                    );
                }
                else
                {
                    libraryProcessed = 0;
                    libraryFound = 0;
                }

                processedFiles += libraryProcessed;
                foundMetadata += libraryFound;

                var cumulativeProgress = totalFiles > 0
                    ? (double)processedFiles / Math.Max(1, totalFiles) * 100.0
                    : currentOperation.Progress;

                currentOperation = currentOperation with
                {
                    ProcessedFiles = processedFiles,
                    FoundMetadata = foundMetadata,
                    Progress = cumulativeProgress,
                    CurrentFile = $"Scanned {library.Title}",
                };
                taskContext.SetPayload(currentOperation);
                taskContext.ReportProgress(
                    currentOperation.Progress,
                    currentOperation.CurrentFile,
                    currentOperation
                );
                await BroadcastScanOperationAsync(currentOperation, cancellationToken);
            }

            currentOperation = currentOperation with
            {
                State = ScanOperationState.Completed,
                Progress = 100.0,
                ProcessedFiles = processedFiles,
                FoundMetadata = foundMetadata,
                CompletedTime = DateTime.UtcNow,
                CurrentFile = "Scan completed",
                EstimatedTimeSeconds = 0,
            };
            taskContext.SetPayload(currentOperation);
            taskContext.ReportProgress(100, currentOperation.CurrentFile, currentOperation);
            await BroadcastScanOperationAsync(currentOperation, CancellationToken.None);

            _logger.LogInformation(
                "Background scan completed: {OperationId}. Processed: {Processed}, Found metadata: {Found}",
                operationId,
                processedFiles,
                foundMetadata
            );

            ScheduleScanOperationRemoval(operationId, TimeSpan.FromSeconds(3));
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Background scan cancelled: {OperationId}", operationId);

            currentOperation = currentOperation with
            {
                State = ScanOperationState.Cancelled,
                CompletedTime = DateTime.UtcNow,
                CurrentFile = "Scan cancelled",
            };
            taskContext.SetPayload(currentOperation);
            taskContext.ReportStatus("Scan cancelled", currentOperation);
            await BroadcastScanOperationAsync(currentOperation, CancellationToken.None);

            ScheduleScanOperationRemoval(operationId, TimeSpan.FromSeconds(3));

            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during background scan: {OperationId}", operationId);

            currentOperation = currentOperation with
            {
                State = ScanOperationState.Failed,
                CompletedTime = DateTime.UtcNow,
                ErrorMessage = ex.Message,
                CurrentFile = "Scan failed",
            };
            taskContext.SetPayload(currentOperation);
            taskContext.ReportStatus("Scan failed", currentOperation);
            await BroadcastScanOperationAsync(currentOperation, CancellationToken.None);

            ScheduleScanOperationRemoval(operationId, TimeSpan.FromSeconds(10));

            throw;
        }
    }

    private Task<IReadOnlyList<LibraryInfo>> GetLibrariesAsync()
    {
        var libraries = _librariesCollection.FindAll().ToList();
        return Task.FromResult<IReadOnlyList<LibraryInfo>>(libraries);
    }

    private List<string> ScanDirectoryForMediaFiles(string directoryPath)
    {
        var mediaExtensions = new[]
        {
            ".mp4",
            ".mkv",
            ".avi",
            ".mov",
            ".m4v",
            ".wmv",
            ".flv",
            ".webm",
        };
        var mediaFiles = new List<string>();

        try
        {
            var files = Directory
                .GetFiles(directoryPath, "*.*", SearchOption.AllDirectories)
                .Where(file => mediaExtensions.Contains(Path.GetExtension(file).ToLowerInvariant()))
                .ToList();

            mediaFiles.AddRange(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scanning directory: {DirectoryPath}", directoryPath);
        }

        return mediaFiles;
    }

    private async Task<(int processed, int found)> ScanTVShowLibraryAsync(
        LibraryInfo library,
        string fullDirectoryPath,
        bool refreshExisting,
        CancellationToken cancellationToken
    )
    {
        var showDirectories = Directory.GetDirectories(
            fullDirectoryPath,
            "*",
            SearchOption.TopDirectoryOnly
        );
        _logger.LogDebug(
            "Found {Count} show directories in TV library: {Title}",
            showDirectories.Length,
            library.Title
        );

        var processed = 0;
        var found = 0;

        foreach (var showDirectory in showDirectories)
        {
            try
            {
                cancellationToken.ThrowIfCancellationRequested();
                var directoryInfo = new DirectoryInfo(showDirectory);
                var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(
                    directoryInfo.Name
                );
                if (string.IsNullOrEmpty(showTitle))
                {
                    _logger.LogDebug(
                        "Could not extract TV show title from directory: {DirectoryPath}",
                        showDirectory
                    );
                    continue;
                }

                var existingMetadata = _tvShowMetadataCollection.FindOne(tv =>
                    tv.LibraryId == library.Id && tv.Title == showTitle
                );

                if (existingMetadata != null)
                {
                    if (!refreshExisting)
                    {
                        _logger.LogDebug(
                            "Metadata already exists for TV show: {ShowTitle} (skipping due to refreshExisting=false)",
                            showTitle
                        );
                        continue;
                    }

                    _logger.LogDebug(
                        "Updating existing metadata for TV show: {ShowTitle}",
                        showTitle
                    );

                    var updatedTmdbResult = await SearchTMDbForTVShow(showTitle);
                    if (updatedTmdbResult != null)
                    {
                        var updatedTvShowMetadata = await CreateTVShowMetadata(
                            updatedTmdbResult.Id,
                            library.Id!,
                            showDirectory
                        );

                        updatedTvShowMetadata.Id = existingMetadata.Id;
                        updatedTvShowMetadata.CreatedAt = existingMetadata.CreatedAt;
                        updatedTvShowMetadata.UpdatedAt = DateTime.UtcNow;

                        _tvShowMetadataCollection.Update(updatedTvShowMetadata);

                        _logger.LogInformation(
                            "Updated metadata for TV show: {Title} - Directory: {DirectoryName}",
                            updatedTvShowMetadata.Title,
                            Path.GetFileName(showDirectory)
                        );

                        found++;
                    }
                    else
                    {
                        _logger.LogDebug(
                            "No TMDb results found for TV show: {ShowTitle} (existing show)",
                            showTitle
                        );
                    }

                    processed++;
                    await Task.Delay(250, cancellationToken);
                    continue;
                }

                _logger.LogDebug("Searching TMDb for TV show: {ShowTitle}", showTitle);
                var tmdbResult = await SearchTMDbForTVShow(showTitle);

                if (tmdbResult != null)
                {
                    var tvShowMetadata = await CreateTVShowMetadata(
                        tmdbResult.Id,
                        library.Id!,
                        showDirectory
                    );
                    _tvShowMetadataCollection.Insert(tvShowMetadata);

                    _logger.LogInformation(
                        "Added metadata for TV show: {Title} - Directory: {DirectoryName}",
                        tvShowMetadata.Title,
                        Path.GetFileName(showDirectory)
                    );

                    found++;
                }
                else
                {
                    _logger.LogDebug("No TMDb results found for TV show: {ShowTitle}", showTitle);
                }

                processed++;

                await Task.Delay(250, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing TV show directory: {DirectoryPath}",
                    showDirectory
                );
            }
        }

        if (library.Id is { } libraryId)
        {
            ClearMissingTvShowFiles(libraryId);
        }

        return (processed, found);
    }

    private async Task<SearchTv?> SearchTMDbForTVShow(string tvShowTitle)
    {
        try
        {
            var searchResults = await _tmdbClient.SearchTvShowAsync(tvShowTitle);
            if (searchResults?.Results?.Count > 0)
            {
                return searchResults
                    .Results.OrderByDescending(tv => tv.Popularity)
                    .FirstOrDefault();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TMDb for TV show: {TVShowTitle}", tvShowTitle);
            return null;
        }
    }

    private async Task<TVShowMetadata> CreateTVShowMetadata(
        int tmdbTvShowId,
        string libraryId,
        string showDirectory
    )
    {
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbTvShowId);
        var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(tmdbTvShowId);
        var tvShowMetadata = tvShowDetails.Create(ObjectId.NewObjectId().ToString());

        tvShowMetadata.Genres =
            tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>();
        tvShowMetadata.Networks =
            tvShowDetails.Networks?.Select(n => n.Map()).ToArray() ?? Array.Empty<Network>();
        tvShowMetadata.LibraryId = libraryId;
        tvShowMetadata.Crew =
            tvShowCredits.Crew?.Select(c => c.Map()).ToArray() ?? Array.Empty<CrewMember>();
        tvShowMetadata.Cast = tvShowCredits.Cast?.Select(c => c.Map()).ToArray() ?? [];

        var seasons = new List<TVSeasonMetadata>();

        foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
        {
            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                tmdbTvShowId,
                season.SeasonNumber
            );

            var seasonMetadata = seasonDetails.Create();
            var episodes = new List<TVEpisodeMetadata>();

            foreach (var episode in seasonDetails.Episodes)
            {
                var filePath = FindEpisodeFile(
                    showDirectory,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );
                if (filePath is null)
                {
                    continue;
                }

                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbTvShowId,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );

                var episodeMetadata = episodeDetails.Create();
                episodeMetadata.FilePath = filePath;

                episodes.Add(episodeMetadata);
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);

            await Task.Delay(250);
        }

        tvShowMetadata.Seasons = seasons.ToArray();

        return tvShowMetadata;
    }

    private string? FindEpisodeFile(string showDirectory, int seasonNumber, int episodeNumber)
    {
        try
        {
            var mediaExtensions = new[]
            {
                ".mp4",
                ".mkv",
                ".avi",
                ".mov",
                ".m4v",
                ".wmv",
                ".flv",
                ".webm",
            };

            var patterns = new[]
            {
                $"*S{seasonNumber:D2}E{episodeNumber:D2}*",
                $"*S{seasonNumber}E{episodeNumber}*",
                $"*Season {seasonNumber}*Episode {episodeNumber}*",
                $"*{seasonNumber}x{episodeNumber:D2}*",
            };

            foreach (var pattern in patterns)
            {
                var files = Directory
                    .GetFiles(showDirectory, pattern, SearchOption.AllDirectories)
                    .Where(file =>
                        mediaExtensions.Contains(Path.GetExtension(file).ToLowerInvariant())
                    )
                    .ToList();

                if (files.Any())
                {
                    return files.First();
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error finding episode file for S{Season}E{Episode}",
                seasonNumber,
                episodeNumber
            );
            return null;
        }
    }

    private void ClearMissingMovieFiles(string libraryId)
    {
        var movieMetadataEntries = _movieMetadataCollection
            .Find(m => m.LibraryId == libraryId)
            .ToList();

        foreach (var metadata in movieMetadataEntries)
        {
            if (string.IsNullOrWhiteSpace(metadata.FilePath))
            {
                continue;
            }

            var storedPath = metadata.FilePath;
            var absolutePath = ResolveMediaPath(storedPath);

            if (absolutePath != null && File.Exists(absolutePath))
            {
                continue;
            }

            metadata.LibraryId = null;
            metadata.FilePath = null;
            metadata.UpdatedAt = DateTime.UtcNow;
            _movieMetadataCollection.Update(metadata);

            _logger.LogInformation(
                "Cleared file path for movie '{Title}' because the file is missing: {FilePath}",
                metadata.Title,
                storedPath
            );
        }
    }

    private void ClearMissingTvShowFiles(string libraryId)
    {
        var tvShows = _tvShowMetadataCollection.Find(tv => tv.LibraryId == libraryId).ToList();

        foreach (var tvShow in tvShows)
        {
            var hasChanges = false;
            var hasEpisodeWithFile = false;

            foreach (var season in tvShow.Seasons ?? Array.Empty<TVSeasonMetadata>())
            {
                foreach (var episode in season.Episodes ?? Array.Empty<TVEpisodeMetadata>())
                {
                    if (string.IsNullOrWhiteSpace(episode.FilePath))
                    {
                        continue;
                    }

                    var storedPath = episode.FilePath;
                    var absolutePath = ResolveMediaPath(storedPath);

                    if (absolutePath != null && File.Exists(absolutePath))
                    {
                        hasEpisodeWithFile = true;
                        continue;
                    }

                    episode.FilePath = null;
                    hasChanges = true;

                    _logger.LogInformation(
                        "Cleared file path for TV episode '{Title}' S{Season:D2}E{Episode:D2} because the file is missing: {FilePath}",
                        tvShow.Title,
                        episode.SeasonNumber,
                        episode.EpisodeNumber,
                        storedPath
                    );
                }
            }

            var shouldUpdate = hasChanges;

            if (!hasEpisodeWithFile && tvShow.LibraryId != null)
            {
                tvShow.LibraryId = null;
                shouldUpdate = true;
            }

            if (!shouldUpdate)
            {
                continue;
            }

            tvShow.UpdatedAt = DateTime.UtcNow;
            _tvShowMetadataCollection.Update(tvShow);
        }
    }

    private string? ResolveMediaPath(string filePath)
    {
        if (string.IsNullOrWhiteSpace(filePath))
        {
            return null;
        }

        try
        {
            return Path.IsPathRooted(filePath)
                ? filePath
                : Path.GetFullPath(Path.Combine(_dataPath, filePath));
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Failed to resolve media path: {FilePath}", filePath);
            return null;
        }
    }

    private async Task<(int processed, int found, ScanOperationInfo operation)> ScanMovieLibraryWithProgressAsync(
        ScanOperationInfo operation,
        BackgroundTaskContext taskContext,
        LibraryInfo library,
        string fullDirectoryPath,
        bool refreshExisting,
        int baseProcessedFiles,
        int totalFiles
    )
    {
        var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
        var processed = 0;
        var found = 0;
        var currentOperation = operation;

        foreach (var filePath in mediaFiles)
        {
            taskContext.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            var totalProcessedSoFar = baseProcessedFiles + processed;
            var progress =
                totalFiles > 0
                    ? (double)totalProcessedSoFar / Math.Max(1, totalFiles) * 100.0
                    : 0.0;

            var elapsedSeconds = (DateTime.UtcNow - currentOperation.StartTime).TotalSeconds;
            var speed = elapsedSeconds > 0 ? totalProcessedSoFar / elapsedSeconds : 0;
            double? eta = null;
            if (speed > 0)
            {
                var remaining = Math.Max(0, totalFiles - totalProcessedSoFar);
                eta = remaining / speed;
            }

            currentOperation = currentOperation with
            {
                ProcessedFiles = totalProcessedSoFar,
                Progress = progress,
                CurrentFile = fileName,
                SpeedFilesPerSecond = speed,
                EstimatedTimeSeconds = eta,
            };
            taskContext.SetPayload(currentOperation);

            if (processed % 10 == 0 || processed == 1)
            {
                taskContext.ReportProgress(
                    currentOperation.Progress,
                    $"Processing {fileName}",
                    currentOperation
                );
                await BroadcastScanOperationAsync(
                    currentOperation,
                    taskContext.CancellationToken
                );
            }

            var movieTitle = MetadataHelper.ExtractMovieTitleFromFileName(
                Path.GetFileName(filePath)
            );
            if (string.IsNullOrWhiteSpace(movieTitle))
            {
                processed++;
                continue;
            }

            var relativePath = Path.GetRelativePath(_dataPath, filePath);
            var existingMetadata = _movieMetadataCollection.FindOne(m =>
                m.LibraryId == library.Id && m.FilePath == relativePath
            );

            if (existingMetadata != null && !refreshExisting)
            {
                processed++;
                found++;
                continue;
            }

            try
            {
                var searchResults = await _tmdbClient.SearchMovieAsync(
                    movieTitle,
                    cancellationToken: taskContext.CancellationToken
                );
                if (searchResults.Results.Count > 0)
                {
                    var movieResult = searchResults.Results[0];
                    var movieDetails = await _tmdbClient.GetMovieAsync(
                        movieResult.Id,
                        cancellationToken: taskContext.CancellationToken
                    );

                    if (existingMetadata != null)
                    {
                        var movieMetadata = existingMetadata.Update(movieDetails);
                        movieMetadata.LibraryId = library.Id;
                        movieMetadata.FilePath = relativePath;
                        movieMetadata.UpdatedAt = DateTime.UtcNow;
                        _movieMetadataCollection.Update(movieMetadata);
                    }
                    else
                    {
                        var movieMetadata = movieDetails.Create(ObjectId.NewObjectId().ToString());
                        movieMetadata.LibraryId = library.Id;
                        movieMetadata.FilePath = relativePath;
                        movieMetadata.CreatedAt = DateTime.UtcNow;
                        movieMetadata.UpdatedAt = DateTime.UtcNow;
                        _movieMetadataCollection.Insert(movieMetadata);
                    }

                    found++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to fetch metadata for movie: {MovieTitle} (File: {FilePath})",
                    movieTitle,
                    filePath
                );
            }

            processed++;

            await Task.Delay(250, taskContext.CancellationToken);
        }

        if (library.Id is { } libraryId)
        {
            ClearMissingMovieFiles(libraryId);
        }

        return (processed, found, currentOperation);
    }

    private async Task BroadcastScanOperationAsync(
        ScanOperationInfo operation,
        CancellationToken cancellationToken = default
    )
    {
        try
        {
            await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", operation, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to broadcast scan operation update for {OperationId}",
                operation.Id
            );
        }
    }

    private void ScheduleScanOperationRemoval(string operationId, TimeSpan delay)
    {
        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(delay);
                await _hubContext.Clients.All.SendAsync("ScanOperationDeleted", operationId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(
                    ex,
                    "Failed to broadcast scan operation deletion for {OperationId}",
                    operationId
                );
            }
        });
    }
}
