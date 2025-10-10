using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.General;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

internal sealed class MetadataScanTaskExecutor
    : IBackgroundTaskExecutor<MetadataScanTask, ScanOperationInfo>
{
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<FileMetadata> _fileMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<MetadataScanTaskExecutor> _logger;

    public MetadataScanTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        IConfiguration configuration,
        ILogger<MetadataScanTaskExecutor> logger
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");
        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _fileMetadataCollection = database.GetCollection<FileMetadata>("fileMetadata");
        _tmdbClient = tmdbClient;
        _logger = logger;
    }

    public async Task ExecuteAsync(
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context
    )
    {
        var task = context.Task;
        var operationId = task.Id.ToString();
        var currentOperation = new ScanOperationInfo(
            operationId,
            LibraryPath: "All Libraries",
            LibraryTitle: "Scanning all libraries",
            TotalFiles: 0,
            ProcessedFiles: 0,
            FoundMetadata: 0,
            StartTime: DateTime.UtcNow,
            CurrentFile: "Preparing library scan"
        );
        var refreshExisting = task.RefreshExisting;

        context.SetPayload(currentOperation);

        try
        {
            _logger.LogInformation(
                "Starting background metadata scan operation: {OperationId}",
                operationId
            );

            var libraries = await GetLibrariesAsync();
            var allFiles = new List<(LibraryInfo library, List<string> files)>();
            var totalFiles = 0;

            foreach (var library in libraries)
            {
                context.ThrowIfCancellationRequested();

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
            context.SetPayload(currentOperation);

            var processedFiles = 0;
            var foundMetadata = 0;

            foreach (var (library, files) in allFiles)
            {
                context.ThrowIfCancellationRequested();

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);

                currentOperation = currentOperation with
                {
                    LibraryPath = library.DirectoryPath,
                    LibraryTitle = library.Title,
                    CurrentFile = $"Scanning {library.Title}...",
                };
                context.SetPayload(currentOperation);

                int libraryProcessed;
                int libraryFound;

                if (library.Type == LibraryType.Movies)
                {
                    (libraryProcessed, libraryFound, currentOperation) =
                        await ScanMovieLibraryWithProgressAsync(
                            currentOperation,
                            context,
                            library,
                            fullDirectoryPath,
                            refreshExisting,
                            processedFiles,
                            totalFiles
                        );
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    (
                        libraryProcessed,
                        libraryFound,
                        currentOperation
                    ) = await ScanTVShowLibraryWithProgressAsync(
                        currentOperation,
                        context,
                        library,
                        fullDirectoryPath,
                        refreshExisting,
                        processedFiles,
                        totalFiles
                    );
                }
                else
                {
                    libraryProcessed = 0;
                    libraryFound = 0;
                }

                processedFiles += libraryProcessed;
                foundMetadata += libraryFound;

                var cumulativeProgress =
                    totalFiles > 0 ? (double)processedFiles / Math.Max(1, totalFiles) * 100.0 : 0.0;

                currentOperation = currentOperation with
                {
                    ProcessedFiles = processedFiles,
                    FoundMetadata = foundMetadata,
                    CurrentFile = $"Scanned {library.Title}",
                };
                context.SetPayload(currentOperation);
                context.ReportProgress(cumulativeProgress);
            }

            currentOperation = currentOperation with
            {
                ProcessedFiles = processedFiles,
                FoundMetadata = foundMetadata,
                CurrentFile = "Scan completed",
                EstimatedTimeSeconds = 0,
            };
            context.SetPayload(currentOperation);
            context.ReportProgress(100);

            _logger.LogInformation(
                "Background scan completed: {OperationId}. Processed: {Processed}, Found metadata: {Found}",
                operationId,
                processedFiles,
                foundMetadata
            );

        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Background scan cancelled: {OperationId}", operationId);

            currentOperation = currentOperation with { CurrentFile = "Scan cancelled" };
            context.SetPayload(currentOperation);
            context.ReportStatus(BackgroundTaskStatus.Cancelled);

            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during background scan: {OperationId}", operationId);

            currentOperation = currentOperation with { CurrentFile = "Scan failed" };
            context.SetPayload(currentOperation);
            context.ReportStatus(BackgroundTaskStatus.Failed);

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

    private async Task<(
        int processed,
        int found,
        ScanOperationInfo operation
    )> ScanTVShowLibraryWithProgressAsync(
        ScanOperationInfo operation,
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context,
        LibraryInfo library,
        string fullDirectoryPath,
        bool refreshExisting,
        int baseProcessedFiles,
        int totalFiles
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

        var processedEpisodeFiles = 0;
        var found = 0;
        var currentOperation = operation;

        foreach (var showDirectory in showDirectories)
        {
            context.ThrowIfCancellationRequested();

            var directoryInfo = new DirectoryInfo(showDirectory);
            var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(
                directoryInfo.Name
            );
            var showYear = MetadataHelper.ExtractYearFromString(directoryInfo.Name);
            if (string.IsNullOrEmpty(showTitle))
            {
                _logger.LogDebug(
                    "Could not extract TV show title from directory: {DirectoryPath}",
                    showDirectory
                );
                continue;
            }

            var episodeFiles = ScanDirectoryForMediaFiles(showDirectory);
            var episodeCount = episodeFiles.Count;

            var totalProcessedSoFar = baseProcessedFiles + processedEpisodeFiles;
            var progress = totalFiles > 0
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
                CurrentFile = $"Scanning {showTitle}",
                SpeedFilesPerSecond = speed,
                EstimatedTimeSeconds = eta,
            };
            context.SetPayload(currentOperation);

            if (processedEpisodeFiles == 0 || processedEpisodeFiles % 10 == 0)
            {
                context.ReportProgress(progress);
            }

            var skipShow = false;
            var shouldDelay = false;

            try
            {
                // Check if TV show already exists by title
                var existingMetadata = _tvShowMetadataCollection.FindOne(tv => tv.Title == showTitle);

                if (existingMetadata != null)
                {
                    if (!refreshExisting)
                    {
                        _logger.LogDebug(
                            "Metadata already exists for TV show: {ShowTitle} (skipping due to refreshExisting=false)",
                            showTitle
                        );
                        skipShow = true;
                    }
                    else
                    {
                        _logger.LogDebug(
                            "Updating existing metadata for TV show: {ShowTitle}",
                            showTitle
                        );

                        var updatedTmdbResult = await SearchTMDbForTVShow(showTitle, showYear);
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

                        shouldDelay = true;
                    }
                }
                else
                {
                    _logger.LogDebug("Searching TMDb for TV show: {ShowTitle}", showTitle);
                    var tmdbResult = await SearchTMDbForTVShow(showTitle, showYear);

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
                        _logger.LogDebug(
                            "No TMDb results found for TV show: {ShowTitle}",
                            showTitle
                        );
                    }

                    shouldDelay = true;
                }

                if (shouldDelay)
                {
                    await Task.Delay(250, context.CancellationToken);
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Error processing TV show directory: {DirectoryPath}",
                    showDirectory
                );
            }
            finally
            {
                processedEpisodeFiles += episodeCount;

                var totalProcessedAfterShow = baseProcessedFiles + processedEpisodeFiles;
                var progressAfter = totalFiles > 0
                    ? (double)totalProcessedAfterShow / Math.Max(1, totalFiles) * 100.0
                    : 0.0;
                var elapsedAfter = (DateTime.UtcNow - currentOperation.StartTime).TotalSeconds;
                var speedAfter = elapsedAfter > 0 ? totalProcessedAfterShow / elapsedAfter : 0;
                double? etaAfter = null;
                if (speedAfter > 0)
                {
                    var remaining = Math.Max(0, totalFiles - totalProcessedAfterShow);
                    etaAfter = remaining / speedAfter;
                }

                var completionLabel = skipShow
                    ? $"Skipped {showTitle}"
                    : $"Scanned {showTitle}";

                currentOperation = currentOperation with
                {
                    ProcessedFiles = totalProcessedAfterShow,
                    CurrentFile = completionLabel,
                    SpeedFilesPerSecond = speedAfter,
                    EstimatedTimeSeconds = etaAfter,
                };
                context.SetPayload(currentOperation);
                context.ReportProgress(progressAfter);
            }
        }

        if (library.Id is { } libraryId)
        {
            ClearMissingTvShowFiles(libraryId);
        }

        return (processedEpisodeFiles, found, currentOperation);
    }

    private async Task<SearchTv?> SearchTMDbForTVShow(string tvShowTitle, int? firstAirDateYear)
    {
        try
        {
            var searchResults = await SearchAsync(firstAirDateYear);

            if ((searchResults?.Results?.Count ?? 0) == 0 && firstAirDateYear.HasValue)
            {
                _logger.LogDebug(
                    "Retrying TMDb TV show search without year for {TVShowTitle}",
                    tvShowTitle
                );
                searchResults = await SearchAsync(null);
            }

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

        async Task<SearchContainer<SearchTv>?> SearchAsync(int? year)
        {
            return year.HasValue
                ? await _tmdbClient.SearchTvShowAsync(
                    tvShowTitle,
                    firstAirDateYear: year.Value,
                    cancellationToken: CancellationToken.None
                )
                : await _tmdbClient.SearchTvShowAsync(
                    tvShowTitle,
                    cancellationToken: CancellationToken.None
                );
        }
    }

    private async Task<TVShowMetadata> CreateTVShowMetadata(
        int tmdbTvShowId,
        string libraryId,
        string showDirectory
    )
    {
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbTvShowId, extraMethods: TvShowMethods.Credits);
        var tvShowMetadata = tvShowDetails.Create();

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

                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbTvShowId,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );

                var episodeMetadata = episodeDetails.Create();

                // Create FileMetadata if file exists
                if (filePath != null)
                {
                    var fileMetadata = new FileMetadata
                    {
                        Id = ObjectId.NewObjectId().ToString(),
                        LibraryId = libraryId,
                        MediaId = tmdbTvShowId.ToString(),
                        MediaType = LibraryType.TVShows,
                        FilePath = filePath,
                        SeasonNumber = season.SeasonNumber,
                        EpisodeNumber = episode.EpisodeNumber,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _fileMetadataCollection.Insert(fileMetadata);
                }

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
        var fileMetadataEntries = _fileMetadataCollection
            .Find(f => f.LibraryId == libraryId && f.MediaType == LibraryType.Movies)
            .ToList();

        foreach (var fileMetadata in fileMetadataEntries)
        {
            var absolutePath = ResolveMediaPath(fileMetadata.FilePath);

            if (absolutePath != null && File.Exists(absolutePath))
            {
                continue;
            }

            // Delete the file metadata record if file no longer exists
            _fileMetadataCollection.Delete(new BsonValue(fileMetadata.Id!));

            var movieMetadata = _movieMetadataCollection.FindById(new BsonValue(int.Parse(fileMetadata.MediaId)));

            _logger.LogInformation(
                "Deleted file metadata for movie '{Title}' because the file is missing: {FilePath}",
                movieMetadata?.Title ?? fileMetadata.MediaId,
                fileMetadata.FilePath
            );
        }
    }

    private void ClearMissingTvShowFiles(string libraryId)
    {
        var fileMetadataEntries = _fileMetadataCollection
            .Find(f => f.LibraryId == libraryId && f.MediaType == LibraryType.TVShows)
            .ToList();

        foreach (var fileMetadata in fileMetadataEntries)
        {
            var absolutePath = ResolveMediaPath(fileMetadata.FilePath);

            if (absolutePath != null && File.Exists(absolutePath))
            {
                continue;
            }

            // Delete the file metadata record if file no longer exists
            _fileMetadataCollection.Delete(new BsonValue(fileMetadata.Id!));

            var tvShow = _tvShowMetadataCollection.FindById(new BsonValue(int.Parse(fileMetadata.MediaId)));

            _logger.LogInformation(
                "Deleted file metadata for TV episode '{Title}' S{Season:D2}E{Episode:D2} because the file is missing: {FilePath}",
                tvShow?.Title ?? fileMetadata.MediaId,
                fileMetadata.SeasonNumber ?? 0,
                fileMetadata.EpisodeNumber ?? 0,
                fileMetadata.FilePath
            );
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

    private async Task<(
        int processed,
        int found,
        ScanOperationInfo operation
    )> ScanMovieLibraryWithProgressAsync(
        ScanOperationInfo operation,
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context,
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
            context.ThrowIfCancellationRequested();

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
                CurrentFile = fileName,
                SpeedFilesPerSecond = speed,
                EstimatedTimeSeconds = eta,
            };
            context.SetPayload(currentOperation);

            if (processed % 10 == 0 || processed == 1)
            {
                context.ReportProgress(progress);
            }

            var movieTitle = MetadataHelper.ExtractMovieTitleFromFileName(fileName);
            var releaseYear = MetadataHelper.ExtractYearFromString(
                Path.GetFileNameWithoutExtension(filePath)
            );
            if (string.IsNullOrWhiteSpace(movieTitle))
            {
                processed++;
                continue;
            }

            var relativePath = Path.GetRelativePath(_dataPath, filePath);
            
            // Check if this file already has metadata
            var existingFileMetadata = _fileMetadataCollection.FindOne(f =>
                f.LibraryId == library.Id && f.FilePath == relativePath && f.MediaType == LibraryType.Movies
            );

            if (existingFileMetadata != null && !refreshExisting)
            {
                processed++;
                found++;
                continue;
            }
            
            // Get existing movie metadata if file is already associated
            MovieMetadata? existingMetadata = null;
            if (existingFileMetadata != null)
            {
                existingMetadata = _movieMetadataCollection.FindById(new BsonValue(int.Parse(existingFileMetadata.MediaId)));
            }

            try
            {
                SearchContainer<SearchMovie>? searchResults = null;

                if (releaseYear.HasValue)
                {
                    searchResults = await _tmdbClient.SearchMovieAsync(
                        movieTitle,
                        year: releaseYear.Value,
                        cancellationToken: context.CancellationToken
                    );

                    if ((searchResults?.Results?.Count ?? 0) == 0)
                    {
                        _logger.LogDebug(
                            "Retrying TMDb movie search without year for {MovieTitle}",
                            movieTitle
                        );
                        searchResults = await _tmdbClient.SearchMovieAsync(
                            movieTitle,
                            cancellationToken: context.CancellationToken
                        );
                    }
                }
                else
                {
                    searchResults = await _tmdbClient.SearchMovieAsync(
                        movieTitle,
                        cancellationToken: context.CancellationToken
                    );
                }

                if (searchResults?.Results?.Count > 0)
                {
                    var movieResult = searchResults.Results[0];
                    var movieDetails = await _tmdbClient.GetMovieAsync(
                        movieResult.Id,
                        extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits,
                        cancellationToken: context.CancellationToken
                    );

                    MovieMetadata movieMetadata;
                    if (existingMetadata != null)
                    {
                        // Update existing metadata
                        movieDetails.Update(existingMetadata);
                        _movieMetadataCollection.Update(existingMetadata);
                        movieMetadata = existingMetadata;
                    }
                    else
                    {
                        // Create new metadata
                        movieMetadata = movieDetails.Create();
                        _movieMetadataCollection.Insert(movieMetadata);
                    }

                    // Create or update FileMetadata
                    if (existingFileMetadata != null)
                    {
                        existingFileMetadata.UpdatedAt = DateTime.UtcNow;
                        _fileMetadataCollection.Update(existingFileMetadata);
                    }
                    else
                    {
                        var fileMetadata = new FileMetadata
                        {
                            Id = ObjectId.NewObjectId().ToString(),
                            LibraryId = library.Id!,
                            MediaId = movieMetadata.Id.ToString(),
                            MediaType = LibraryType.Movies,
                            FilePath = relativePath,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _fileMetadataCollection.Insert(fileMetadata);
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

            await Task.Delay(250, context.CancellationToken);
        }

        if (library.Id is { } libraryId)
        {
            ClearMissingMovieFiles(libraryId);
        }

        return (processed, found, currentOperation);
    }

}
