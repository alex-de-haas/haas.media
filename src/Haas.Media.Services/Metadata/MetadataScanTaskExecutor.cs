using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Services.Utilities;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.General;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

internal sealed class MetadataScanTaskExecutor
    : IBackgroundTaskExecutor<MetadataScanTask, ScanOperationInfo>
{
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<FileMetadata> _fileMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<MetadataScanTaskExecutor> _logger;
    private readonly ITmdbLanguageProvider _languageProvider;
    private readonly ITmdbCountryProvider _countryProvider;

    public MetadataScanTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        IConfiguration configuration,
        ILogger<MetadataScanTaskExecutor> logger,
        ITmdbLanguageProvider languageProvider,
        ITmdbCountryProvider countryProvider
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");
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
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context
    )
    {
        var task = context.Task;
        var operationId = task.Id.ToString();
        var currentOperation = new ScanOperationInfo(
            operationId,
            LibraryPath: "All Libraries",
            LibraryTitle: "Scanning all libraries",
            StartTime: DateTime.UtcNow
        );

        context.ReportStatus(BackgroundTaskStatus.Running);
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

                // Apply preferred language for TMDb API calls
                ApplyPreferredLanguage();

                if (library.Type == LibraryType.Movies)
                {
                    await ScanMovieLibraryWithProgressAsync(context, library, fullDirectoryPath);
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    await ScanTVShowLibraryWithProgressAsync(context, library, fullDirectoryPath);
                }

                // Get the updated payload after library scan
                currentOperation = context.State.Payload!;
            }

            currentOperation = currentOperation with { CurrentFile = "Scan completed", };
            context.SetPayload(currentOperation);
            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "Background scan completed: {OperationId}. Processed: {Processed}, Found metadata: {Found}",
                operationId,
                context.State.Payload!.ProcessedFiles,
                context.State.Payload!.FoundMetadata
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

    private async Task ScanTVShowLibraryWithProgressAsync(
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context,
        LibraryInfo library,
        string fullDirectoryPath
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
        var currentOperation = context.State.Payload!;
        var totalPeople = currentOperation.TotalPeople;
        var syncedPeople = currentOperation.SyncedPeople;
        var failedPeople = currentOperation.FailedPeople;

        var totalFiles = currentOperation.TotalFiles;
        var baseProcessedFiles = currentOperation.ProcessedFiles;

        foreach (var showDirectory in showDirectories)
        {
            context.ThrowIfCancellationRequested();

            var directoryInfo = new DirectoryInfo(showDirectory);
            var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(directoryInfo.Name);
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
            currentOperation = currentOperation with
            {
                ProcessedFiles = totalProcessedSoFar,
                CurrentFile = $"Scanning {showTitle}",
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople,
            };
            context.SetPayload(currentOperation);
            UpdateProgress();

            var skipShow = false;
            var foundThisShow = 0;

            try
            {
                // Check if TV show already exists by title
                var existingMetadata = _tvShowMetadataCollection.FindOne(tv =>
                    tv.Title == showTitle
                );

                if (existingMetadata is null)
                {
                    _logger.LogDebug("Searching TMDb for TV show: {ShowTitle}", showTitle);
                    var tmdbResult = await SearchTMDbForTVShow(showTitle, showYear);

                    if (tmdbResult != null)
                    {
                        var (tvShowMetadata, personSyncStats) = await CreateTVShowMetadata(
                            tmdbResult.Id,
                            library.Id!,
                            showDirectory,
                            context.CancellationToken,
                            onTotalPeopleCountAvailable: count =>
                            {
                                totalPeople += count;
                                currentOperation = currentOperation with
                                {
                                    TotalPeople = totalPeople,
                                };
                                context.SetPayload(currentOperation);
                                UpdateProgress();
                            },
                            onPersonSyncProgress: x =>
                            {
                                if (x.Outcome == PersonSyncOutcome.Failed)
                                {
                                    failedPeople++;
                                }
                                else
                                {
                                    syncedPeople++;
                                }

                                currentOperation = currentOperation with
                                {
                                    SyncedPeople = syncedPeople,
                                    FailedPeople = failedPeople
                                };
                                context.SetPayload(currentOperation);
                                UpdateProgress();
                            }
                        );
                        _tvShowMetadataCollection.Insert(tvShowMetadata);

                        _logger.LogInformation(
                            "Added metadata for TV show: {Title} - Directory: {DirectoryName}",
                            tvShowMetadata.Title,
                            Path.GetFileName(showDirectory)
                        );

                        foundThisShow = 1;
                        found++;
                    }
                    else
                    {
                        _logger.LogDebug(
                            "No TMDb results found for TV show: {ShowTitle}",
                            showTitle
                        );
                    }
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
                var completionLabel = skipShow ? $"Skipped {showTitle}" : $"Scanned {showTitle}";

                currentOperation = currentOperation with
                {
                    ProcessedFiles = totalProcessedAfterShow,
                    FoundMetadata = currentOperation.FoundMetadata + foundThisShow,
                    CurrentFile = completionLabel,
                    TotalPeople = totalPeople,
                    SyncedPeople = syncedPeople,
                    FailedPeople = failedPeople,
                };
                context.SetPayload(currentOperation);
                UpdateProgress();
            }
        }

        // Update final state with processed files count
        var finalProcessedFiles = baseProcessedFiles + processedEpisodeFiles;
        currentOperation = currentOperation with
        {
            ProcessedFiles = finalProcessedFiles,
            TotalPeople = totalPeople,
            SyncedPeople = syncedPeople,
            FailedPeople = failedPeople,
        };
        context.SetPayload(currentOperation);
        UpdateProgress();

        if (library.Id is { } libraryId)
        {
            ClearMissingTvShowFiles(libraryId);
        }

        void UpdateProgress()
        {
            var totalProcessed = baseProcessedFiles + processedEpisodeFiles;
            var progress = MetadataProgressCalculator.Calculate(
                totalProcessed,
                totalFiles,
                syncedPeople,
                currentOperation.TotalPeople
            );
            context.ReportProgress(progress);
        }
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

    private async Task<(
        TVShowMetadata Metadata,
        PersonSyncStatistics PersonSync
    )> CreateTVShowMetadata(
        int tmdbTvShowId,
        string libraryId,
        string showDirectory,
        CancellationToken cancellationToken,
        Action<int>? onTotalPeopleCountAvailable = null,
        Action<PersonSyncProgress>? onPersonSyncProgress = null
    )
    {
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(
            tmdbTvShowId,
            extraMethods: TvShowMethods.Credits | TvShowMethods.Images,
            cancellationToken: cancellationToken
        );

        if (tvShowDetails is null)
        {
            throw new InvalidOperationException(
                $"TV show with TMDb ID {tmdbTvShowId} was not found."
            );
        }

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        var tvShowMetadata = tvShowDetails.Create(preferredCountry, preferredLanguage);
        var associatedPersonIds = new HashSet<int>();
        associatedPersonIds.UnionWith(PersonMetadataCollector.FromCredits(tvShowDetails.Credits));
        associatedPersonIds.UnionWith(
            PersonMetadataCollector.FromCreators(tvShowDetails.CreatedBy)
        );

        var seasons = new List<TVSeasonMetadata>();

        foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
        {
            cancellationToken.ThrowIfCancellationRequested();

            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                tmdbTvShowId,
                season.SeasonNumber,
                cancellationToken: cancellationToken
            );

            if (seasonDetails is null)
            {
                continue;
            }

            associatedPersonIds.UnionWith(
                PersonMetadataCollector.FromCredits(seasonDetails.Credits)
            );

            var seasonMetadata = seasonDetails.Create();
            var episodes = new List<TVEpisodeMetadata>();

            foreach (var episode in seasonDetails.Episodes ?? Enumerable.Empty<TvSeasonEpisode>())
            {
                cancellationToken.ThrowIfCancellationRequested();

                var filePath = FindEpisodeFile(
                    showDirectory,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );

                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbTvShowId,
                    season.SeasonNumber,
                    episode.EpisodeNumber,
                    cancellationToken: cancellationToken
                );

                if (episodeDetails is null)
                {
                    continue;
                }

                var episodeMetadata = episodeDetails.Create();

                associatedPersonIds.UnionWith(
                    PersonMetadataCollector.FromCredits(episodeDetails.Credits)
                );
                associatedPersonIds.UnionWith(
                    PersonMetadataCollector.FromCrew(episodeDetails.Crew)
                );
                associatedPersonIds.UnionWith(
                    PersonMetadataCollector.FromCast(episodeDetails.GuestStars)
                );

                if (filePath != null)
                {
                    // Calculate MD5 hash of the file
                    string? md5Hash = null;
                    try
                    {
                        var fullFilePath = Path.Combine(_dataPath, filePath);
                        md5Hash = await FileHashUtility.CalculateMd5HashAsync(
                            fullFilePath,
                            cancellationToken
                        );
                        _logger.LogDebug(
                            "Calculated MD5 hash for {FilePath}: {Hash}",
                            filePath,
                            md5Hash
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(
                            ex,
                            "Failed to calculate MD5 hash for {FilePath}. File will be added without hash.",
                            filePath
                        );
                    }

                    var fileMetadata = new FileMetadata
                    {
                        Id = Guid.CreateVersion7().ToString(),
                        LibraryId = libraryId,
                        MediaId = tmdbTvShowId,
                        MediaType = LibraryType.TVShows,
                        FilePath = filePath,
                        Md5Hash = md5Hash,
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
        }

        tvShowMetadata.Seasons = seasons.ToArray();

        // Report total people count before syncing
        onTotalPeopleCountAvailable?.Invoke(associatedPersonIds.Count);

        var personSyncStats = await PersonMetadataSynchronizer.SyncAsync(
            _tmdbClient,
            _personMetadataCollection,
            _logger,
            associatedPersonIds,
            false,
            reportProgress: onPersonSyncProgress,
            cancellationToken: cancellationToken
        );

        return (tvShowMetadata, personSyncStats);
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

            var movieMetadata = _movieMetadataCollection.FindById(fileMetadata.MediaId);

            _logger.LogInformation(
                "Deleted file metadata for movie '{Title}' because the file is missing: {FilePath}",
                movieMetadata?.Title ?? fileMetadata.MediaId.ToString(),
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

            var tvShow = _tvShowMetadataCollection.FindById(fileMetadata.MediaId);

            _logger.LogInformation(
                "Deleted file metadata for TV episode '{Title}' S{Season:D2}E{Episode:D2} because the file is missing: {FilePath}",
                tvShow?.Title ?? fileMetadata.MediaId.ToString(),
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

    private async Task ScanMovieLibraryWithProgressAsync(
        BackgroundWorkerContext<MetadataScanTask, ScanOperationInfo> context,
        LibraryInfo library,
        string fullDirectoryPath
    )
    {
        var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);

        var currentState = context.State.Payload!;
        var processedFiles = currentState.ProcessedFiles;
        var foundMetadata = currentState.FoundMetadata;
        var totalPeople = currentState.TotalPeople;
        var syncedPeople = currentState.SyncedPeople;
        var failedPeople = currentState.FailedPeople;

        foreach (var filePath in mediaFiles)
        {
            context.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);

            currentState = currentState with
            {
                FoundMetadata = foundMetadata,
                ProcessedFiles = processedFiles,
                CurrentFile = fileName,
                TotalPeople = totalPeople,
                SyncedPeople = syncedPeople,
                FailedPeople = failedPeople,
            };
            context.SetPayload(currentState);

            UpdateProgress();

            var movieTitle = MetadataHelper.ExtractMovieTitleFromFileName(fileName);
            var releaseYear = MetadataHelper.ExtractYearFromString(
                Path.GetFileNameWithoutExtension(filePath)
            );
            if (string.IsNullOrWhiteSpace(movieTitle))
            {
                // Skip files that don't yield a valid title
                processedFiles++;
                continue;
            }

            var relativePath = Path.GetRelativePath(_dataPath, filePath);

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
                        extraMethods: MovieMethods.ReleaseDates
                            | MovieMethods.Credits
                            | MovieMethods.Images,
                        cancellationToken: context.CancellationToken
                    );

                    var peopleCountInMedia = movieDetails.Credits?.Cast?.Count ?? 0;
                    peopleCountInMedia += movieDetails.Credits?.Crew?.Count ?? 0;

                    foundMetadata++;

                    if (peopleCountInMedia > 0)
                    {
                        totalPeople += peopleCountInMedia;

                        currentState = currentState with
                        {
                            TotalPeople = totalPeople,
                            FoundMetadata = foundMetadata
                        };
                        context.SetPayload(currentState);
                        UpdateProgress();
                    }

                    var personSyncStats = await PersonMetadataSynchronizer.SyncAsync(
                        _tmdbClient,
                        _personMetadataCollection,
                        _logger,
                        PersonMetadataCollector.FromCredits(movieDetails.Credits),
                        false,
                        reportProgress: x =>
                        {
                            if (x.Outcome == PersonSyncOutcome.Failed)
                            {
                                failedPeople++;
                            }
                            else
                            {
                                syncedPeople++;
                            }

                            currentState = currentState with
                            {
                                SyncedPeople = syncedPeople,
                                FailedPeople = failedPeople
                            };
                            context.SetPayload(currentState);
                            UpdateProgress();
                        },
                        cancellationToken: context.CancellationToken
                    );

                    MovieMetadata movieMetadata;

                    var existsMovieMetadata = _movieMetadataCollection.FindById(
                        new BsonValue(movieResult.Id)
                    );

                    var preferredCountry = _countryProvider.GetPreferredCountryCode();
                    var preferredLanguage = _languageProvider.GetPreferredLanguage();
                    if (existsMovieMetadata != null)
                    {
                        // Update existing metadata
                        movieDetails.Update(
                            existsMovieMetadata,
                            preferredCountry,
                            preferredLanguage
                        );
                        _movieMetadataCollection.Update(existsMovieMetadata);
                        movieMetadata = existsMovieMetadata;
                    }
                    else
                    {
                        // Create new metadata
                        movieMetadata = movieDetails.Create(preferredCountry, preferredLanguage);
                        _movieMetadataCollection.Insert(movieMetadata);
                    }

                    // Check if this file already has metadata in this library
                    var existingFileMetadata = _fileMetadataCollection
                        .Query()
                        .Where(f =>
                            f.LibraryId == library.Id
                            && f.FilePath == relativePath
                            && f.MediaType == LibraryType.Movies
                            && f.MediaId == movieMetadata.Id
                        )
                        .FirstOrDefault();

                    // Create or update FileMetadata
                    if (existingFileMetadata != null)
                    {
                        existingFileMetadata.LibraryId = library.Id!;
                        existingFileMetadata.UpdatedAt = DateTime.UtcNow;
                        
                        // Calculate and update MD5 hash if not present
                        if (string.IsNullOrEmpty(existingFileMetadata.Md5Hash))
                        {
                            try
                            {
                                existingFileMetadata.Md5Hash = await FileHashUtility.CalculateMd5HashAsync(
                                    filePath,
                                    context.CancellationToken
                                );
                                _logger.LogDebug(
                                    "Calculated MD5 hash for existing file {FilePath}: {Hash}",
                                    relativePath,
                                    existingFileMetadata.Md5Hash
                                );
                            }
                            catch (Exception ex)
                            {
                                _logger.LogWarning(
                                    ex,
                                    "Failed to calculate MD5 hash for existing file {FilePath}",
                                    relativePath
                                );
                            }
                        }
                        
                        _fileMetadataCollection.Update(existingFileMetadata);
                    }
                    else
                    {
                        // Calculate MD5 hash for new file
                        string? md5Hash = null;
                        try
                        {
                            md5Hash = await FileHashUtility.CalculateMd5HashAsync(
                                filePath,
                                context.CancellationToken
                            );
                            _logger.LogDebug(
                                "Calculated MD5 hash for {FilePath}: {Hash}",
                                relativePath,
                                md5Hash
                            );
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(
                                ex,
                                "Failed to calculate MD5 hash for {FilePath}. File will be added without hash.",
                                relativePath
                            );
                        }

                        var fileMetadata = new FileMetadata
                        {
                            Id = Guid.CreateVersion7().ToString(),
                            LibraryId = library.Id!,
                            MediaId = movieMetadata.Id,
                            MediaType = LibraryType.Movies,
                            FilePath = relativePath,
                            Md5Hash = md5Hash,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _fileMetadataCollection.Insert(fileMetadata);
                    }
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

            processedFiles++;
        }

        // Update final state with processed files count
        currentState = currentState with
        {
            ProcessedFiles = processedFiles,
            FoundMetadata = foundMetadata,
            TotalPeople = totalPeople,
            SyncedPeople = syncedPeople,
            FailedPeople = failedPeople,
        };
        context.SetPayload(currentState);
        UpdateProgress();

        if (library.Id is { } libraryId)
        {
            ClearMissingMovieFiles(libraryId);
        }

        void UpdateProgress()
        {
            var totalFiles = currentState.TotalFiles;
            var progress = MetadataProgressCalculator.Calculate(
                processedFiles,
                totalFiles,
                syncedPeople,
                currentState.TotalPeople
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
}
