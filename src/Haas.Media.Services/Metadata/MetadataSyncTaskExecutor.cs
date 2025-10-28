using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Services.Utilities;
using LiteDB;
using TMDbLib.Client;
using TMDbLib.Objects.General;
using TMDbLib.Objects.Movies;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Services.Metadata;

internal sealed class MetadataSyncTaskExecutor
    : IBackgroundTaskExecutor<MetadataSyncTask, MetadataSyncOperationInfo>
{
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<FileMetadata> _fileMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly TMDbClient _tmdbClient;
    private readonly ILogger<MetadataSyncTaskExecutor> _logger;
    private readonly ITmdbLanguageProvider _languageProvider;
    private readonly ITmdbCountryProvider _countryProvider;

    public MetadataSyncTaskExecutor(
        LiteDatabase database,
        TMDbClient tmdbClient,
        IConfiguration configuration,
        ILogger<MetadataSyncTaskExecutor> logger,
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
        BackgroundWorkerContext<MetadataSyncTask, MetadataSyncOperationInfo> context
    )
    {
        var task = context.Task;
        var operationId = task.Id.ToString();

        var payload = new MetadataSyncOperationInfo(
            Id: operationId,
            StartTime: DateTime.UtcNow,
            Stage: "Initializing"
        );

        context.ReportStatus(BackgroundTaskStatus.Running);
        context.SetPayload(payload);

        try
        {
            _logger.LogInformation(
                "Starting metadata sync operation: {OperationId} (Libraries: {LibraryCount}, RefreshMovies: {RefreshMovies}, RefreshTvShows: {RefreshTvShows}, RefreshPeople: {RefreshPeople})",
                operationId,
                task.LibraryIds.Count > 0 ? string.Join(", ", task.LibraryIds) : "All",
                task.RefreshMovies,
                task.RefreshTvShows,
                task.RefreshPeople
            );

            // Apply preferred language
            ApplyPreferredLanguage();

            // Step 1: Get libraries to sync
            var libraries = await GetLibrariesToSyncAsync(task.LibraryIds);
            if (libraries.Count == 0)
            {
                payload = payload with
                {
                    Stage = "No libraries found to sync",
                    CompletedAt = DateTime.UtcNow
                };
                context.SetPayload(payload);
                context.ReportProgress(100);
                context.ReportStatus(BackgroundTaskStatus.Completed);
                return;
            }

            // Step 2: Read existing file metadata from database for selected libraries
            payload = payload with
            {
                Stage = "Loading existing file metadata"
            };
            context.SetPayload(payload);

            var existingFileMetadata = new Dictionary<string, FileMetadata>();
            foreach (var library in libraries)
            {
                var filesInLibrary = _fileMetadataCollection
                    .Query()
                    .Where(f => f.LibraryId == library.Id)
                    .ToList();

                foreach (var file in filesInLibrary)
                {
                    existingFileMetadata[file.FilePath] = file;
                }
            }

            // Step 3: Scan for new files and detect changes
            payload = payload with
            {
                Stage = "Scanning for new files"
            };
            context.SetPayload(payload);

            var newFiles = new List<(LibraryInfo library, string filePath, string relativePath)>();

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

                var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
                foreach (var filePath in mediaFiles)
                {
                    var relativePath = Path.GetRelativePath(_dataPath, filePath);
                    if (!existingFileMetadata.ContainsKey(relativePath))
                    {
                        newFiles.Add((library, filePath, relativePath));
                    }
                }
            }

            payload = payload with
            {
                TotalNewFiles = newFiles.Count,
                Stage = $"Found {newFiles.Count} new files"
            };
            context.SetPayload(payload);
            UpdateProgress();

            // Step 4: Process new files and create metadata (no MD5 hash calculation)
            var newTvShows = new List<TVShowMetadata>();
            var processedNewFiles = 0;

            foreach (var (library, filePath, relativePath) in newFiles)
            {
                context.ThrowIfCancellationRequested();

                var fileName = Path.GetFileName(filePath);
                payload = payload with
                {
                    Stage = "Processing new files",
                    CurrentItem = fileName,
                    ProcessedNewFiles = processedNewFiles
                };
                context.SetPayload(payload);
                UpdateProgress();

                try
                {
                    if (library.Type == LibraryType.Movies)
                    {
                        var fileMetadata = await ProcessNewMovieFileAsync(
                            library,
                            filePath,
                            relativePath,
                            context.CancellationToken
                        );
                        if (fileMetadata != null)
                        {
                            existingFileMetadata[relativePath] = fileMetadata;
                        }
                        else
                        {
                            _logger.LogWarning(
                                "Could not extract movie metadata from file: {FilePath}",
                                relativePath
                            );
                        }
                    }
                    else if (library.Type == LibraryType.TVShows)
                    {
                        // For TV shows, we process by directory (show level)
                        // Skip individual episode processing here
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to process new file: {FilePath}", relativePath);
                }

                processedNewFiles++;
            }

            // Process new TV shows by directory
            var processedTvShowDirectories = new HashSet<string>();
            foreach (var library in libraries.Where(l => l.Type == LibraryType.TVShows))
            {
                context.ThrowIfCancellationRequested();

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);
                var showDirectories = Directory.GetDirectories(
                    fullDirectoryPath,
                    "*",
                    SearchOption.TopDirectoryOnly
                );

                foreach (var showDirectory in showDirectories)
                {
                    context.ThrowIfCancellationRequested();

                    if (processedTvShowDirectories.Contains(showDirectory))
                    {
                        continue;
                    }
                    processedTvShowDirectories.Add(showDirectory);

                    var directoryInfo = new DirectoryInfo(showDirectory);
                    var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(
                        directoryInfo.Name
                    );

                    if (string.IsNullOrEmpty(showTitle))
                    {
                        continue;
                    }

                    // Check if show already exists
                    var existingShow = _tvShowMetadataCollection.FindOne(tv =>
                        tv.Title == showTitle
                    );

                    if (existingShow == null)
                    {
                        payload = payload with
                        {
                            Stage = "Processing new TV show",
                            CurrentItem = showTitle
                        };
                        context.SetPayload(payload);

                        var tvShowMetadata = await ProcessNewTvShowDirectoryAsync(
                            library,
                            showDirectory,
                            context.CancellationToken
                        );
                        if (tvShowMetadata != null)
                        {
                            newTvShows.Add(tvShowMetadata);
                        }
                    }
                }
            }

            // Step 5: Collect all movies and TV shows to refresh
            payload = payload with
            {
                Stage = "Preparing metadata refresh"
            };
            context.SetPayload(payload);

            var allMovieIds = task.RefreshMovies
                ? existingFileMetadata
                    .Where(x => x.Value.LibraryType == LibraryType.Movies)
                    .Select(x => x.Value.TmdbId)
                    .Distinct()
                    .ToArray()
                : [];
            var allTvShowIds = task.RefreshTvShows
                ? existingFileMetadata
                    .Where(x => x.Value.LibraryType == LibraryType.TVShows)
                    .Select(x => x.Value.TmdbId)
                    .Distinct()
                    .ToArray()
                : [];

            var existingMovieIds = _movieMetadataCollection
                .Find(x => allMovieIds.Contains(x.Id))
                .Select(x => x.Id)
                .ToArray();
            var existingTvShowIds = _tvShowMetadataCollection
                .Find(x => allTvShowIds.Contains(x.Id))
                .Select(x => x.Id)
                .ToArray();

            var missingMovieIds = allMovieIds.Except(existingMovieIds).ToArray();
            var missingTvShowIds = allTvShowIds.Except(existingTvShowIds).ToArray();

            await SyncMissingMoviesAsync(missingMovieIds);
            await SyncMissingTvShowsAsync(missingTvShowIds);

            var allMoviesToRefresh = _movieMetadataCollection
                .Query()
                .Where(x => allMovieIds.Contains(x.Id) || missingMovieIds.Contains(x.Id))
                .ToArray();

            var allTvShowsToRefresh = _tvShowMetadataCollection
                .Query()
                .Where(x => allTvShowIds.Contains(x.Id) || missingTvShowIds.Contains(x.Id))
                .ToArray();

            var missingMovies = allMoviesToRefresh
                .Where(m => missingMovieIds.Contains(m.Id))
                .ToArray();
            var missingTvShows = allTvShowsToRefresh
                .Where(tv => missingTvShowIds.Contains(tv.Id))
                .ToArray();

            var allPeopleIdsToRefresh = GetPeopleIdsFromMovies(
                    task.RefreshPeople ? allMoviesToRefresh : missingMovies
                )
                .Concat(
                    GetPeopleIdsFromTvShows(
                        task.RefreshPeople ? allTvShowsToRefresh : missingTvShows
                    )
                )
                .Distinct()
                .ToArray();

            // Step 6: Calculate total items for progress
            payload = payload with
            {
                TotalMovies = allMoviesToRefresh.Length,
                TotalTvShows = allTvShowsToRefresh.Length,
                TotalPeople = allPeopleIdsToRefresh.Length,
                Stage = "Starting metadata refresh"
            };
            context.SetPayload(payload);
            UpdateProgress();

            // Step 7: Refresh movies
            var processedMovies = 0;
            var processedPeople = 0;
            var syncedPeople = 0;
            var failedPeople = 0;

            foreach (var movie in allMoviesToRefresh)
            {
                context.ThrowIfCancellationRequested();

                var displayTitle = string.IsNullOrWhiteSpace(movie.Title)
                    ? $"TMDb #{movie.Id}"
                    : movie.Title;

                payload = payload with
                {
                    Stage = "Refreshing movie metadata",
                    CurrentItem = displayTitle,
                    ProcessedMovies = processedMovies
                };
                context.SetPayload(payload);
                UpdateProgress();

                try
                {
                    await RefreshMovieAsync(movie, context.CancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to refresh movie metadata for {Title} (TMDb {TmdbId})",
                        displayTitle,
                        movie.Id
                    );
                    payload = payload with { LastError = ex.Message };
                    context.SetPayload(payload);
                }

                processedMovies++;
            }

            // Step 8: Refresh TV shows
            var processedTvShows = 0;

            foreach (var tvShow in allTvShowsToRefresh)
            {
                context.ThrowIfCancellationRequested();

                var displayTitle = string.IsNullOrWhiteSpace(tvShow.Title)
                    ? $"TMDb #{tvShow.Id}"
                    : tvShow.Title;

                payload = payload with
                {
                    Stage = "Refreshing TV show metadata",
                    CurrentItem = displayTitle,
                    ProcessedTvShows = processedTvShows
                };
                context.SetPayload(payload);
                UpdateProgress();

                try
                {
                    await RefreshTvShowAsync(tvShow, context.CancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(
                        ex,
                        "Failed to refresh TV show metadata for {Title} (TMDb {TmdbId})",
                        displayTitle,
                        tvShow.Id
                    );
                    payload = payload with { LastError = ex.Message };
                    context.SetPayload(payload);
                }

                processedTvShows++;
            }

            // Step 9: Refresh people
            await PersonMetadataSynchronizer.SyncAsync(
                _tmdbClient,
                _personMetadataCollection,
                _logger,
                allPeopleIdsToRefresh,
                refreshExisting: true,
                cancellationToken: context.CancellationToken,
                reportProgress: progress =>
                {
                    if (progress.Outcome == PersonSyncOutcome.Failed)
                    {
                        failedPeople++;
                    }
                    else
                    {
                        syncedPeople++;
                    }
                    processedPeople++;

                    payload = payload with
                    {
                        ProcessedPeople = processedPeople,
                        SyncedPeople = syncedPeople,
                        FailedPeople = failedPeople
                    };
                    context.SetPayload(payload);
                    UpdateProgress();
                }
            );

            // Complete
            payload = payload with
            {
                Stage = "Sync completed",
                CurrentItem = null,
                CompletedAt = DateTime.UtcNow,
                LastError = null
            };
            context.SetPayload(payload);
            context.ReportProgress(100);
            context.ReportStatus(BackgroundTaskStatus.Completed);

            _logger.LogInformation(
                "Metadata sync completed: {OperationId}. New files: {NewFiles}, Movies: {Movies}, TV Shows: {TvShows}, People: {People}",
                operationId,
                newFiles.Count,
                allMoviesToRefresh.Length,
                allTvShowsToRefresh.Length,
                allPeopleIdsToRefresh.Length
            );
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Metadata sync cancelled: {OperationId}", operationId);
            payload = payload with { Stage = "Sync cancelled", CompletedAt = DateTime.UtcNow };
            context.SetPayload(payload);
            context.ReportStatus(BackgroundTaskStatus.Cancelled);
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during metadata sync: {OperationId}", operationId);
            payload = payload with
            {
                Stage = "Sync failed",
                LastError = ex.Message,
                CompletedAt = DateTime.UtcNow
            };
            context.SetPayload(payload);
            context.ReportStatus(BackgroundTaskStatus.Failed);
            throw;
        }

        void UpdateProgress()
        {
            var totalItems =
                payload.TotalNewFiles
                + payload.TotalMovies
                + payload.TotalTvShows
                + payload.TotalPeople;
            var processedItems =
                payload.ProcessedNewFiles
                + payload.ProcessedMovies
                + payload.ProcessedTvShows
                + payload.ProcessedPeople;

            if (totalItems > 0)
            {
                var progress = (int)((double)processedItems / totalItems * 100);
                context.ReportProgress(Math.Min(progress, 99));
            }
        }
    }

    private async Task<List<LibraryInfo>> GetLibrariesToSyncAsync(List<string> libraryIds)
    {
        if (libraryIds.Count == 0)
        {
            return _librariesCollection.FindAll().ToList();
        }

        var libraries = new List<LibraryInfo>();
        foreach (var id in libraryIds)
        {
            var library = _librariesCollection.FindById(new BsonValue(id));
            if (library != null)
            {
                libraries.Add(library);
            }
        }

        return libraries;
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

    private async Task<FileMetadata?> ProcessNewMovieFileAsync(
        LibraryInfo library,
        string filePath,
        string relativePath,
        CancellationToken cancellationToken
    )
    {
        var fileName = Path.GetFileName(filePath);
        var movieTitle = MetadataHelper.ExtractMovieTitleFromFileName(fileName);
        var releaseYear = MetadataHelper.ExtractYearFromString(
            Path.GetFileNameWithoutExtension(filePath)
        );

        if (string.IsNullOrWhiteSpace(movieTitle))
        {
            return null;
        }

        try
        {
            // Search TMDb
            SearchContainer<SearchMovie>? searchResults = null;

            if (releaseYear.HasValue)
            {
                searchResults = await _tmdbClient.SearchMovieAsync(
                    movieTitle,
                    year: releaseYear.Value,
                    cancellationToken: cancellationToken
                );

                if ((searchResults?.Results?.Count ?? 0) == 0)
                {
                    searchResults = await _tmdbClient.SearchMovieAsync(
                        movieTitle,
                        cancellationToken: cancellationToken
                    );
                }
            }
            else
            {
                searchResults = await _tmdbClient.SearchMovieAsync(
                    movieTitle,
                    cancellationToken: cancellationToken
                );
            }

            if (searchResults?.Results?.Count > 0)
            {
                var movieResult = searchResults.Results[0];

                // Create file metadata (without MD5 hash)
                var fileMetadata = new FileMetadata
                {
                    Id = Guid.CreateVersion7().ToString(),
                    LibraryId = library.Id!,
                    TmdbId = movieResult.Id,
                    LibraryType = LibraryType.Movies,
                    FilePath = relativePath,
                    Md5Hash = null, // No MD5 hash calculation
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _fileMetadataCollection.Insert(fileMetadata);

                return fileMetadata;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to process movie file: {FilePath}", relativePath);
        }

        return null;
    }

    private async Task<TVShowMetadata?> ProcessNewTvShowDirectoryAsync(
        LibraryInfo library,
        string showDirectory,
        CancellationToken cancellationToken
    )
    {
        var directoryInfo = new DirectoryInfo(showDirectory);
        var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(directoryInfo.Name);
        var showYear = MetadataHelper.ExtractYearFromString(directoryInfo.Name);

        if (string.IsNullOrEmpty(showTitle))
        {
            return null;
        }

        try
        {
            // Search TMDb
            var searchResults = await SearchTMDbForTVShow(showTitle, showYear, cancellationToken);
            if (searchResults == null)
            {
                return null;
            }

            // Get TV show details
            var tvShowDetails = await _tmdbClient.GetTvShowAsync(
                searchResults.Id,
                extraMethods: TvShowMethods.Credits | TvShowMethods.Images,
                cancellationToken: cancellationToken
            );

            if (tvShowDetails == null)
            {
                return null;
            }

            var preferredCountry = _countryProvider.GetPreferredCountryCode();
            var preferredLanguage = _languageProvider.GetPreferredLanguage();
            var tvShowMetadata = tvShowDetails.Create(preferredCountry, preferredLanguage);

            // Process seasons and episodes
            var seasons = new List<TVSeasonMetadata>();
            foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
            {
                cancellationToken.ThrowIfCancellationRequested();

                var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                    searchResults.Id,
                    season.SeasonNumber,
                    cancellationToken: cancellationToken
                );

                if (seasonDetails == null)
                {
                    continue;
                }

                var seasonMetadata = seasonDetails.Create();
                var episodes = new List<TVEpisodeMetadata>();

                foreach (
                    var episode in seasonDetails.Episodes ?? Enumerable.Empty<TvSeasonEpisode>()
                )
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                        searchResults.Id,
                        season.SeasonNumber,
                        episode.EpisodeNumber,
                        cancellationToken: cancellationToken
                    );

                    if (episodeDetails == null)
                    {
                        continue;
                    }

                    var episodeMetadata = episodeDetails.Create();
                    episodes.Add(episodeMetadata);

                    // Find and store file metadata for this episode
                    var filePath = FindEpisodeFile(
                        showDirectory,
                        season.SeasonNumber,
                        episode.EpisodeNumber
                    );

                    if (filePath != null)
                    {
                        var relativePath = Path.GetRelativePath(_dataPath, filePath);
                        var fileMetadata = new FileMetadata
                        {
                            Id = Guid.CreateVersion7().ToString(),
                            LibraryId = library.Id!,
                            TmdbId = searchResults.Id,
                            LibraryType = LibraryType.TVShows,
                            FilePath = relativePath,
                            Md5Hash = null, // No MD5 hash calculation
                            SeasonNumber = season.SeasonNumber,
                            EpisodeNumber = episode.EpisodeNumber,
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        };
                        _fileMetadataCollection.Insert(fileMetadata);
                    }
                }

                seasonMetadata.Episodes = episodes.ToArray();
                seasons.Add(seasonMetadata);
            }

            tvShowMetadata.Seasons = seasons.ToArray();
            _tvShowMetadataCollection.Insert(tvShowMetadata);

            return tvShowMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to process TV show directory: {Directory}",
                showDirectory
            );
        }

        return null;
    }

    private async Task<SearchTv?> SearchTMDbForTVShow(
        string tvShowTitle,
        int? year,
        CancellationToken cancellationToken
    )
    {
        try
        {
            SearchContainer<SearchTv>? searchResults = null;

            if (year.HasValue)
            {
                searchResults = await _tmdbClient.SearchTvShowAsync(
                    tvShowTitle,
                    firstAirDateYear: year.Value,
                    cancellationToken: cancellationToken
                );

                if ((searchResults?.Results?.Count ?? 0) == 0)
                {
                    searchResults = await _tmdbClient.SearchTvShowAsync(
                        tvShowTitle,
                        cancellationToken: cancellationToken
                    );
                }
            }
            else
            {
                searchResults = await _tmdbClient.SearchTvShowAsync(
                    tvShowTitle,
                    cancellationToken: cancellationToken
                );
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
    }

    private string? FindEpisodeFile(string showDirectory, int seasonNumber, int episodeNumber)
    {
        try
        {
            var seasonPattern = $"S{seasonNumber:D2}";
            var episodePattern = $"E{episodeNumber:D2}";
            var pattern = $"{seasonPattern}{episodePattern}";

            var files = Directory.GetFiles(showDirectory, "*.*", SearchOption.AllDirectories);

            return files.FirstOrDefault(f =>
                f.Contains(pattern, StringComparison.OrdinalIgnoreCase)
            );
        }
        catch (Exception ex)
        {
            _logger.LogDebug(
                ex,
                "Failed to find episode file for S{Season}E{Episode} in {Directory}",
                seasonNumber,
                episodeNumber,
                showDirectory
            );
            return null;
        }
    }

    private async Task RefreshMovieAsync(MovieMetadata movie, CancellationToken cancellationToken)
    {
        var tmdbId = movie.Id;
        var movieDetails = await _tmdbClient.GetMovieAsync(
            tmdbId,
            extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits | MovieMethods.Images,
            cancellationToken: cancellationToken
        );

        if (movieDetails == null)
        {
            throw new InvalidOperationException($"Movie with TMDb ID {tmdbId} was not found.");
        }

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        movieDetails.Update(movie, preferredCountry, preferredLanguage);

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
            extraMethods: TvShowMethods.Credits | TvShowMethods.Images,
            cancellationToken: cancellationToken
        );

        if (tvShowDetails == null)
        {
            throw new InvalidOperationException($"TV show with TMDb ID {tmdbId} was not found.");
        }

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

                if (episodeDetails == null)
                {
                    continue;
                }

                var episodeMetadata = episodeDetails.Create();
                episodes.Add(episodeMetadata);
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);
        }

        var preferredCountry = _countryProvider.GetPreferredCountryCode();
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        tvShowDetails.Update(tvShow, preferredCountry, preferredLanguage);

        tvShow.Seasons = seasons.ToArray();

        _tvShowMetadataCollection.Update(tvShow);
    }

    private async Task SyncMissingMoviesAsync(int[] ids)
    {
        foreach (var tmdbId in ids)
        {
            var movieDetails = await _tmdbClient.GetMovieAsync(
                tmdbId,
                extraMethods: MovieMethods.ReleaseDates | MovieMethods.Credits | MovieMethods.Images
            );

            if (movieDetails == null)
            {
                _logger.LogWarning("Movie with TMDb ID {TmdbId} was not found.", tmdbId);
                continue;
            }

            var preferredCountry = _countryProvider.GetPreferredCountryCode();
            var preferredLanguage = _languageProvider.GetPreferredLanguage();
            var movieMetadata = movieDetails.Create(preferredCountry, preferredLanguage);

            _movieMetadataCollection.Insert(movieMetadata);
        }
    }

    private async Task SyncMissingTvShowsAsync(int[] ids)
    {
        foreach (var tmdbId in ids)
        {
            var tvShowDetails = await _tmdbClient.GetTvShowAsync(
                tmdbId,
                extraMethods: TvShowMethods.Credits | TvShowMethods.Images
            );

            if (tvShowDetails == null)
            {
                _logger.LogWarning("TV show with TMDb ID {TmdbId} was not found.", tmdbId);
                continue;
            }

            var preferredCountry = _countryProvider.GetPreferredCountryCode();
            var preferredLanguage = _languageProvider.GetPreferredLanguage();
            var tvShowMetadata = tvShowDetails.Create(preferredCountry, preferredLanguage);

            // Fetch seasons and episodes
            var seasons = new List<TVSeasonMetadata>();
            foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
            {
                var seasonDetails = await _tmdbClient.GetTvSeasonAsync(tmdbId, season.SeasonNumber);

                if (seasonDetails == null)
                {
                    continue;
                }

                var seasonMetadata = seasonDetails.Create();
                var episodes = new List<TVEpisodeMetadata>();

                foreach (
                    var episode in seasonDetails.Episodes ?? Enumerable.Empty<TvSeasonEpisode>()
                )
                {
                    var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                        tmdbId,
                        season.SeasonNumber,
                        episode.EpisodeNumber
                    );

                    if (episodeDetails == null)
                    {
                        continue;
                    }

                    var episodeMetadata = episodeDetails.Create();
                    episodes.Add(episodeMetadata);
                }

                seasonMetadata.Episodes = episodes.ToArray();
                seasons.Add(seasonMetadata);
            }

            tvShowMetadata.Seasons = seasons.ToArray();
            _tvShowMetadataCollection.Insert(tvShowMetadata);
        }
    }

    private int[] GetPeopleIdsFromMovies(IEnumerable<MovieMetadata> movies)
    {
        var personIds = new List<int>();

        foreach (var movie in movies)
        {
            personIds.AddRange(movie.Cast.Select(c => c.Id));
            personIds.AddRange(movie.Crew.Select(c => c.Id));
        }

        return [.. personIds];
    }

    private int[] GetPeopleIdsFromTvShows(IEnumerable<TVShowMetadata> tvShows)
    {
        var personIds = new List<int>();

        foreach (var tvShow in tvShows)
        {
            personIds.AddRange(tvShow.Cast.Select(c => c.Id));
            personIds.AddRange(tvShow.Crew.Select(c => c.Id));

            foreach (var season in tvShow.Seasons)
            {
                foreach (var episode in season.Episodes)
                {
                    personIds.AddRange(episode.Cast.Select(c => c.Id));
                    personIds.AddRange(episode.Crew.Select(c => c.Id));
                }
            }
        }

        return [.. personIds];
    }

    private void ApplyPreferredLanguage()
    {
        var preferredLanguage = _languageProvider.GetPreferredLanguage();
        _tmdbClient.DefaultLanguage = preferredLanguage;
    }
}
