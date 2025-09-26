using System.Collections.Concurrent;
using LiteDB;
using Microsoft.AspNetCore.SignalR;
using TMDbLib.Client;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi, IHostedService
{
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;
    private readonly IHubContext<MetadataHub> _hubContext;
    private readonly ConcurrentDictionary<string, ScanOperationInfo> _scanOperations;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens;
    private Timer? _broadcastTimer;

    public MetadataService(
        IConfiguration configuration,
        ILogger<MetadataService> logger,
        LiteDatabase database,
        IHubContext<MetadataHub> hubContext
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _logger = logger;
        _hubContext = hubContext;
        _scanOperations = new ConcurrentDictionary<string, ScanOperationInfo>();
        _cancellationTokens = new ConcurrentDictionary<string, CancellationTokenSource>();

        var tmdbApiKey =
            configuration["TMDB_API_KEY"]
            ?? throw new ArgumentException("TMDB_API_KEY configuration is required.");

        _tmdbClient = new TMDbClient(tmdbApiKey);
        _tmdbClient.DefaultLanguage = "en"; // Default language as specified in METADATA.md

        // Create indexes
        CreateIndexes();

        _logger.LogInformation("MetadataService initialized");
    }

    public Task<IEnumerable<LibraryInfo>> GetLibrariesAsync()
    {
        var libraries = _librariesCollection.FindAll().ToList();
        _logger.LogDebug("Retrieved {Count} libraries", libraries.Count);
        return Task.FromResult<IEnumerable<LibraryInfo>>(libraries);
    }

    public Task<LibraryInfo?> GetLibraryAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult<LibraryInfo?>(null);
        }

        var library = _librariesCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved library with ID: {Id}", id);
        return Task.FromResult<LibraryInfo?>(library);
    }

    public Task<LibraryInfo> AddLibraryAsync(LibraryInfo library)
    {
        library.Id = ObjectId.NewObjectId().ToString();
        library.CreatedAt = DateTime.UtcNow;
        library.UpdatedAt = DateTime.UtcNow;

        _librariesCollection.Insert(library);
        _logger.LogInformation(
            "Added new library: {Title} at {DirectoryPath}",
            library.Title,
            library.DirectoryPath
        );
        return Task.FromResult(library);
    }

    public Task<LibraryInfo?> UpdateLibraryAsync(string id, LibraryInfo library)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult<LibraryInfo?>(null);
        }

        library.Id = id;
        library.UpdatedAt = DateTime.UtcNow;

        var updated = _librariesCollection.Update(library);

        if (!updated)
        {
            _logger.LogWarning("Library not found with ID: {Id}", id);
            return Task.FromResult<LibraryInfo?>(null);
        }

        _logger.LogInformation("Updated library: {Title} with ID: {Id}", library.Title, id);
        return Task.FromResult<LibraryInfo?>(library);
    }

    public Task<bool> DeleteLibraryAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult(false);
        }

        var deleted = _librariesCollection.Delete(new BsonValue(id));

        if (deleted)
        {
            _logger.LogInformation("Deleted library with ID: {Id}", id);
            return Task.FromResult(true);
        }

        _logger.LogWarning("Library not found with ID: {Id}", id);
        return Task.FromResult(false);
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
            // Scan recursively for media files
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

    public Task<IEnumerable<MovieMetadata>> GetMovieMetadataAsync(string? libraryId = null)
    {
        IEnumerable<MovieMetadata> results = string.IsNullOrEmpty(libraryId)
            ? _movieMetadataCollection.FindAll()
            : _movieMetadataCollection.Find(m => m.LibraryId == libraryId);

        var movieMetadata = results.ToList();
        _logger.LogDebug("Retrieved {Count} movie metadata records", movieMetadata.Count);
        return Task.FromResult<IEnumerable<MovieMetadata>>(movieMetadata);
    }

    public Task<MovieMetadata?> GetMovieMetadataByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult<MovieMetadata?>(null);
        }

        var movieMetadata = _movieMetadataCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved movie metadata with ID: {Id}", id);
        return Task.FromResult<MovieMetadata?>(movieMetadata);
    }

    public Task<bool> DeleteMovieMetadataAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult(false);
        }

        var deleted = _movieMetadataCollection.Delete(new BsonValue(id));

        if (deleted)
        {
            _logger.LogInformation("Deleted movie metadata with ID: {Id}", id);
            return Task.FromResult(true);
        }

        _logger.LogWarning("Movie metadata not found with ID: {Id}", id);
        return Task.FromResult(false);
    }

    private async Task<(int processed, int found)> ScanTVShowLibraryAsync(
        LibraryInfo library,
        string fullDirectoryPath,
        bool refreshExisting = true
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
                var showTitle = MetadataHelper.ExtractTVShowTitleFromDirectoryName(
                    Path.GetDirectoryName(showDirectory)
                );
                if (string.IsNullOrEmpty(showTitle))
                {
                    _logger.LogDebug(
                        "Could not extract TV show title from directory: {DirectoryPath}",
                        showDirectory
                    );
                    continue;
                }

                // Check if metadata already exists for this show
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

                    // Get fresh metadata from TMDb
                    var updatedTmdbResult = await SearchTMDbForTVShow(showTitle);
                    if (updatedTmdbResult != null)
                    {
                        var updatedTvShowMetadata = await CreateTVShowMetadata(
                            updatedTmdbResult.Id,
                            library.Id!,
                            showDirectory
                        );

                        // Preserve the original ID and CreatedAt timestamp
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
                    await Task.Delay(250);
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

                // Add small delay to respect TMDb rate limits
                await Task.Delay(250);
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
                // Return the first result with the highest popularity
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
        // Get detailed TV show information to access seasons
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbTvShowId);

        // Get TV show credits to access crew and cast information
        var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(tmdbTvShowId);

        // Use mapper to convert SearchTv to TVShowMetadata
        var tvShowMetadata = tvShowDetails.Create(ObjectId.NewObjectId().ToString());

        // Set manually populated fields that aren't in the source
        tvShowMetadata.Genres =
            tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>();
        tvShowMetadata.Networks =
            tvShowDetails.Networks?.Select(n => n.Map()).ToArray() ?? Array.Empty<Network>();
        tvShowMetadata.LibraryId = libraryId;

        // Convert crew to our CrewMember format
        tvShowMetadata.Crew =
            tvShowCredits.Crew?.Select(c => c.Map()).ToArray() ?? Array.Empty<CrewMember>();

        // Convert cast to our CastMember format
        tvShowMetadata.Cast = tvShowCredits.Cast?.Select(c => c.Map()).ToArray() ?? [];

        var seasons = new List<TVSeasonMetadata>();

        // Process each season
        foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0)) // Skip specials (season 0)
        {
            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(
                tmdbTvShowId,
                season.SeasonNumber
            );

            // Use mapper to convert TvSeason to TVSeasonMetadata
            var seasonMetadata = seasonDetails.Create();

            var episodes = new List<TVEpisodeMetadata>();

            // Process each episode
            foreach (var episode in seasonDetails.Episodes)
            {
                var filePath = FindEpisodeFile(
                    showDirectory,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );
                if (filePath is null) // Skip if episode file is not found
                {
                    continue;
                }

                // Get episode details
                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbTvShowId,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );

                // Use mapper to convert TvEpisode to TVEpisodeMetadata
                var episodeMetadata = episodeDetails.Create();
                episodeMetadata.FilePath = filePath;

                episodes.Add(episodeMetadata);
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);

            // Add delay between season requests
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

            // Look for episode files in various patterns
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

    public Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null)
    {
        IEnumerable<TVShowMetadata> results = string.IsNullOrEmpty(libraryId)
            ? _tvShowMetadataCollection.FindAll()
            : _tvShowMetadataCollection.Find(tv => tv.LibraryId == libraryId);

        var tvShowMetadata = results.ToList();
        _logger.LogDebug("Retrieved {Count} TV show metadata records", tvShowMetadata.Count);
        return Task.FromResult<IEnumerable<TVShowMetadata>>(tvShowMetadata);
    }

    public Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult<TVShowMetadata?>(null);
        }

        var tvShowMetadata = _tvShowMetadataCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved TV show metadata with ID: {Id}", id);
        return Task.FromResult<TVShowMetadata?>(tvShowMetadata);
    }

    public Task<bool> DeleteTVShowMetadataAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult(false);
        }

        var deleted = _tvShowMetadataCollection.Delete(new BsonValue(id));

        if (deleted)
        {
            _logger.LogInformation("Deleted TV show metadata with ID: {Id}", id);
            return Task.FromResult(true);
        }

        _logger.LogWarning("TV show metadata not found with ID: {Id}", id);
        return Task.FromResult(false);
    }

    public async Task<IEnumerable<SearchResult>> SearchAsync(
        string query,
        LibraryType? libraryType = null
    )
    {
        _logger.LogDebug(
            "Searching TMDB for query: {Query}, libraryType: {LibraryType}",
            query,
            libraryType
        );

        var searchResults = new List<SearchResult>();

        // If libraryType is not specified or is Movies, search for movies
        if (libraryType == null || libraryType == LibraryType.Movies)
        {
            var movieResults = await _tmdbClient.SearchMovieAsync(query);
            if (movieResults?.Results != null)
            {
                foreach (var movie in movieResults.Results.Take(10)) // Limit to 10 results
                {
                    searchResults.Add(
                        new SearchResult
                        {
                            TmdbId = movie.Id,
                            Title = movie.Title ?? string.Empty,
                            OriginalTitle = movie.OriginalTitle ?? string.Empty,
                            Overview = movie.Overview ?? string.Empty,
                            VoteAverage = movie.VoteAverage,
                            VoteCount = movie.VoteCount,
                            Type = LibraryType.Movies,
                            PosterPath = movie.PosterPath,
                            BackdropPath = movie.BackdropPath,
                        }
                    );
                }
            }
        }

        // If libraryType is not specified or is TVShows, search for TV shows
        if (libraryType == null || libraryType == LibraryType.TVShows)
        {
            var tvResults = await _tmdbClient.SearchTvShowAsync(query);
            if (tvResults?.Results != null)
            {
                foreach (var tvShow in tvResults.Results.Take(10)) // Limit to 10 results
                {
                    searchResults.Add(
                        new SearchResult
                        {
                            TmdbId = tvShow.Id,
                            Title = tvShow.Name ?? string.Empty,
                            OriginalTitle = tvShow.OriginalName ?? string.Empty,
                            Overview = tvShow.Overview ?? string.Empty,
                            VoteAverage = tvShow.VoteAverage,
                            VoteCount = tvShow.VoteCount,
                            Type = LibraryType.TVShows,
                            PosterPath = tvShow.PosterPath,
                            BackdropPath = tvShow.BackdropPath,
                        }
                    );
                }
            }
        }

        _logger.LogDebug(
            "Found {Count} search results for query: {Query}",
            searchResults.Count,
            query
        );
        return searchResults;
    }

    public async Task<object> AddToLibraryAsync(AddToLibraryRequest request)
    {
        _logger.LogDebug(
            "Adding to library: LibraryId={LibraryId}, Type={Type}, TmdbId={TmdbId}",
            request.LibraryId,
            request.Type,
            request.TmdbId
        );

        // Validate that the library exists
        var library = await GetLibraryAsync(request.LibraryId);
        if (library == null)
        {
            throw new ArgumentException($"Library with ID '{request.LibraryId}' not found.");
        }

        // Validate that the library type matches the request type
        if (library.Type != request.Type)
        {
            throw new ArgumentException(
                $"Library type mismatch. Library is of type {library.Type}, but request is for {request.Type}."
            );
        }

        if (!int.TryParse(request.TmdbId, out var tmdbId))
        {
            throw new ArgumentException("Invalid TMDB ID format. Must be a valid integer.");
        }

        switch (request.Type)
        {
            case LibraryType.Movies:
                return await AddMovieToLibraryAsync(request.LibraryId, tmdbId);

            case LibraryType.TVShows:
                return await AddTVShowToLibraryAsync(request.LibraryId, tmdbId);

            default:
                throw new ArgumentException($"Unsupported library type: {request.Type}");
        }
    }

    private async Task<MovieMetadata> AddMovieToLibraryAsync(string libraryId, int tmdbId)
    {
        // Check if movie already exists in the library
        var existingMovie = _movieMetadataCollection.FindOne(m =>
            m.LibraryId == libraryId && m.TmdbId == tmdbId
        );

        // Get movie details from TMDB
        var movieDetails = await _tmdbClient.GetMovieAsync(tmdbId);
        if (movieDetails == null)
        {
            throw new ArgumentException($"Movie with TMDB ID {tmdbId} not found on TMDB.");
        }

        // Get movie credits to access crew and cast information
        var movieCredits = await _tmdbClient.GetMovieCreditsAsync(tmdbId);

        // Convert crew to our CrewMember format
        var crew = movieCredits.Crew?.Select(c => c.Map()).ToArray() ?? [];

        // Convert cast to our CastMember format
        var cast = movieCredits.Cast?.Select(c => c.Map()).ToArray() ?? [];

        if (existingMovie != null)
        {
            existingMovie.Update(movieDetails);

            existingMovie.Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? [];
            existingMovie.Crew = crew;
            existingMovie.Cast = cast;
            existingMovie.LibraryId = libraryId;
            existingMovie.UpdatedAt = DateTime.UtcNow;

            if (!_movieMetadataCollection.Update(existingMovie))
            {
                _movieMetadataCollection.Upsert(existingMovie);
            }

            _logger.LogInformation(
                "Updated movie '{Title}' (TMDB ID: {TmdbId}) metadata for library {LibraryId}",
                existingMovie.Title,
                tmdbId,
                libraryId
            );

            return existingMovie;
        }

        var movieMetadata = movieDetails.Create(ObjectId.NewObjectId().ToString());

        movieMetadata.Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? [];
        movieMetadata.Crew = crew;
        movieMetadata.Cast = cast;

        movieMetadata.LibraryId = libraryId;

        movieMetadata.CreatedAt = DateTime.UtcNow;
        movieMetadata.UpdatedAt = DateTime.UtcNow;

        _movieMetadataCollection.Insert(movieMetadata);

        _logger.LogInformation(
            "Successfully added movie '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}",
            movieMetadata.Title,
            tmdbId,
            libraryId
        );

        return movieMetadata;
    }

    private async Task<TVShowMetadata> AddTVShowToLibraryAsync(string libraryId, int tmdbId)
    {
        // Check if TV show already exists in the library
        var existingTVShow = _tvShowMetadataCollection.FindOne(tv =>
            tv.LibraryId == libraryId && tv.TmdbId == tmdbId
        );

        // Get TV show details from TMDB
        var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbId);
        if (tvShowDetails == null)
        {
            throw new ArgumentException($"TV show with TMDB ID {tmdbId} not found on TMDB.");
        }

        // Get TV show credits to access crew and cast information
        var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(tmdbId);

        var crew = tvShowCredits.Crew?.Select(c => c.Map()).ToArray() ?? [];
        var cast = tvShowCredits.Cast?.Select(c => c.Map()).ToArray() ?? [];
        var genres = tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>();
        var networks = tvShowDetails.Networks?.Select(n => n.Map()).ToArray() ?? Array.Empty<Network>();

        Dictionary<(int SeasonNumber, int EpisodeNumber), string?>? existingEpisodeLookup =
            existingTVShow
                ?.Seasons?.SelectMany(season =>
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

        // Process each season (skip specials - season 0)
        foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
        {
            // Get season details to access episodes
            var seasonDetails = await _tmdbClient.GetTvSeasonAsync(tmdbId, season.SeasonNumber);

            // Use mapper to convert TvSeason to TVSeasonMetadata
            var seasonMetadata = seasonDetails.Create();

            var episodes = new List<TVEpisodeMetadata>();

            foreach (var episode in seasonDetails.Episodes)
            {
                // Get episode details
                var episodeDetails = await _tmdbClient.GetTvEpisodeAsync(
                    tmdbId,
                    season.SeasonNumber,
                    episode.EpisodeNumber
                );

                // Use mapper to convert TvSeasonEpisode to TVEpisodeMetadata
                var episodeMetadata = episodeDetails.Create();
                episodeMetadata.FilePath = null; // No file path for manually added items

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
            }

            seasonMetadata.Episodes = episodes.ToArray();
            seasons.Add(seasonMetadata);
        }

        if (existingTVShow != null)
        {
            existingTVShow.Update(tvShowDetails);

            existingTVShow.Genres = genres;
            existingTVShow.Networks = networks;
            existingTVShow.Crew = crew;
            existingTVShow.Cast = cast;
            existingTVShow.Seasons = seasons.ToArray();
            existingTVShow.LibraryId = libraryId;
            existingTVShow.UpdatedAt = DateTime.UtcNow;

            if (!_tvShowMetadataCollection.Update(existingTVShow))
            {
                _tvShowMetadataCollection.Upsert(existingTVShow);
            }

            _logger.LogInformation(
                "Updated TV show '{Title}' (TMDB ID: {TmdbId}) metadata for library {LibraryId}",
                existingTVShow.Title,
                tmdbId,
                libraryId
            );

            return existingTVShow;
        }

        // Use mapper to convert TvShow to TVShowMetadata
        var tvShowMetadata = tvShowDetails.Create(ObjectId.NewObjectId().ToString());

        tvShowMetadata.LibraryId = libraryId;

        // Set manually populated fields that aren't in the source
        tvShowMetadata.Genres = genres;
        tvShowMetadata.Networks = networks;

        tvShowMetadata.CreatedAt = DateTime.UtcNow;
        tvShowMetadata.UpdatedAt = DateTime.UtcNow;

        // Convert crew to our CrewMember format
        tvShowMetadata.Crew = crew;

        // Convert cast to our CastMember format
        tvShowMetadata.Cast = cast;

        tvShowMetadata.Seasons = seasons.ToArray();

        _tvShowMetadataCollection.Insert(tvShowMetadata);

        _logger.LogInformation(
            "Successfully added TV show '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}",
            tvShowMetadata.Title,
            tmdbId,
            libraryId
        );

        return tvShowMetadata;
    }

    private void CreateIndexes()
    {
        try
        {
            _librariesCollection.EnsureIndex(x => x.DirectoryPath, true);
            _librariesCollection.EnsureIndex(x => x.Title);

            _movieMetadataCollection.EnsureIndex(x => x.LibraryId);
            _movieMetadataCollection.EnsureIndex(x => x.TmdbId, true);
            _movieMetadataCollection.EnsureIndex(x => x.Title);

            _tvShowMetadataCollection.EnsureIndex(x => x.LibraryId);
            _tvShowMetadataCollection.EnsureIndex(x => x.TmdbId, true);
            _tvShowMetadataCollection.EnsureIndex(x => x.Title);

            _logger.LogDebug(
                "Created indexes for libraries, movie metadata, and TV show metadata collections"
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error creating indexes");
        }
    }

    public async Task<string> StartScanLibrariesAsync(bool refreshExisting = true)
    {
        var operationId = Guid.NewGuid().ToString();
        _logger.LogInformation(
            "Starting background scan operation with ID: {OperationId}",
            operationId
        );

        var scanOperation = new ScanOperationInfo(
            operationId,
            "All Libraries",
            "Scanning all libraries",
            0,
            0,
            0,
            0.0,
            ScanOperationState.Running,
            DateTime.UtcNow
        );

        _scanOperations.TryAdd(operationId, scanOperation);
        var cancellationTokenSource = new CancellationTokenSource();
        _cancellationTokens.TryAdd(operationId, cancellationTokenSource);

        // Start the scan operation in the background
        _ = Task.Run(async () =>
            await PerformScanOperationAsync(
                operationId,
                refreshExisting,
                cancellationTokenSource.Token
            )
        );

        // Broadcast initial operation state
        try
        {
            await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", scanOperation);
            _logger.LogDebug(
                "Broadcasted initial scan operation state for ID: {OperationId}",
                operationId
            );
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "Failed to broadcast initial scan operation state for ID: {OperationId}",
                operationId
            );
        }

        return operationId;
    }

    public ScanOperationInfo[] GetScanOperations()
    {
        return _scanOperations.Values.ToArray();
    }

    public async Task<bool> CancelScanOperationAsync(string operationId)
    {
        if (_cancellationTokens.TryGetValue(operationId, out var cancellationTokenSource))
        {
            cancellationTokenSource.Cancel();

            if (_scanOperations.TryGetValue(operationId, out var operation))
            {
                var cancelledOperation = operation with
                {
                    State = ScanOperationState.Cancelled,
                    CompletedTime = DateTime.UtcNow,
                };
                _scanOperations.TryUpdate(operationId, cancelledOperation, operation);
                await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", cancelledOperation);

                // Remove the cancelled operation after a short delay
                _ = Task.Run(async () =>
                {
                    await Task.Delay(3000); // Wait 3 seconds
                    _scanOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("ScanOperationDeleted", operationId);
                });
            }

            return true;
        }
        return false;
    }

    private async Task PerformScanOperationAsync(
        string operationId,
        bool refreshExisting,
        CancellationToken cancellationToken
    )
    {
        try
        {
            _logger.LogInformation(
                "Starting background metadata scan operation: {OperationId}",
                operationId
            );

            var libraries = await GetLibrariesAsync();
            var allFiles = new List<(LibraryInfo library, List<string> files)>();
            var totalFiles = 0;

            // First pass: count all files
            foreach (var library in libraries)
            {
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

            // Update operation with total file count
            if (_scanOperations.TryGetValue(operationId, out var currentOperation))
            {
                var updatedOperation = currentOperation with { TotalFiles = totalFiles };
                _scanOperations.TryUpdate(operationId, updatedOperation, currentOperation);
                await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", updatedOperation);
            }

            var processedFiles = 0;
            var foundMetadata = 0;

            // Second pass: process files
            foreach (var (library, files) in allFiles)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);

                if (_scanOperations.TryGetValue(operationId, out var operation))
                {
                    var libOperation = operation with
                    {
                        LibraryPath = library.DirectoryPath,
                        LibraryTitle = library.Title,
                        CurrentFile = $"Scanning {library.Title}...",
                    };
                    _scanOperations.TryUpdate(operationId, libOperation, operation);
                    await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", libOperation);
                }

                int libraryProcessed = 0;
                int libraryFound = 0;

                if (library.Type == LibraryType.Movies)
                {
                    (libraryProcessed, libraryFound) = await ScanMovieLibraryWithProgressAsync(
                        operationId,
                        library,
                        fullDirectoryPath,
                        refreshExisting,
                        processedFiles,
                        totalFiles,
                        cancellationToken
                    );
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    // For TV shows, use the existing non-progress method as it has different scanning logic
                    (libraryProcessed, libraryFound) = await ScanTVShowLibraryAsync(
                        library,
                        fullDirectoryPath,
                        refreshExisting
                    );
                }

                processedFiles += libraryProcessed;
                foundMetadata += libraryFound;
            }

            // Mark as completed
            if (_scanOperations.TryGetValue(operationId, out var finalOperation))
            {
                var completedOperation = finalOperation with
                {
                    State = ScanOperationState.Completed,
                    Progress = 100.0,
                    ProcessedFiles = processedFiles,
                    FoundMetadata = foundMetadata,
                    CompletedTime = DateTime.UtcNow,
                    CurrentFile = "Scan completed",
                    EstimatedTimeSeconds = 0,
                };
                _scanOperations.TryUpdate(operationId, completedOperation, finalOperation);
                await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", completedOperation);

                _logger.LogInformation(
                    "Background scan completed: {OperationId}. Processed: {Processed}, Found metadata: {Found}",
                    operationId,
                    processedFiles,
                    foundMetadata
                );

                // Remove the completed operation after a short delay
                _ = Task.Run(async () =>
                {
                    await Task.Delay(3000); // Wait 3 seconds
                    _scanOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("ScanOperationDeleted", operationId);
                });
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Background scan cancelled: {OperationId}", operationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during background scan: {OperationId}", operationId);

            if (_scanOperations.TryGetValue(operationId, out var operation))
            {
                var failedOperation = operation with
                {
                    State = ScanOperationState.Failed,
                    CompletedTime = DateTime.UtcNow,
                    ErrorMessage = ex.Message,
                };
                _scanOperations.TryUpdate(operationId, failedOperation, operation);
                await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", failedOperation);

                // Remove the failed operation after a delay
                _ = Task.Run(async () =>
                {
                    await Task.Delay(10000); // Wait 10 seconds for errors
                    _scanOperations.TryRemove(operationId, out _);
                    await _hubContext.Clients.All.SendAsync("ScanOperationDeleted", operationId);
                });
            }
        }
        finally
        {
            _cancellationTokens.TryRemove(operationId, out _);
        }
    }

    private async Task<(int processed, int found)> ScanMovieLibraryWithProgressAsync(
        string operationId,
        LibraryInfo library,
        string fullDirectoryPath,
        bool refreshExisting,
        int baseProcessedFiles,
        int totalFiles,
        CancellationToken cancellationToken
    )
    {
        var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
        var processed = 0;
        var found = 0;

        foreach (var filePath in mediaFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            var progress =
                totalFiles > 0
                    ? (double)(baseProcessedFiles + processed) / totalFiles * 100.0
                    : 0.0;

            // Update progress
            if (_scanOperations.TryGetValue(operationId, out var operation))
            {
                var elapsedSeconds = (DateTime.UtcNow - operation.StartTime).TotalSeconds;
                var speed =
                    elapsedSeconds > 0 ? (baseProcessedFiles + processed) / elapsedSeconds : 0;
                double? eta = null;
                if (speed > 0)
                {
                    var remaining = Math.Max(0, totalFiles - (baseProcessedFiles + processed));
                    eta = remaining / speed;
                }

                var updatedOperation = operation with
                {
                    ProcessedFiles = baseProcessedFiles + processed,
                    Progress = progress,
                    CurrentFile = fileName,
                    SpeedFilesPerSecond = speed,
                    EstimatedTimeSeconds = eta,
                };
                _scanOperations.TryUpdate(operationId, updatedOperation, operation);

                // Broadcast progress update immediately (throttle to every 10 files to avoid spam)
                if (processed % 10 == 0 || processed == 1)
                {
                    try
                    {
                        await _hubContext.Clients.All.SendAsync(
                            "ScanOperationUpdated",
                            updatedOperation,
                            cancellationToken
                        );
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to broadcast scan progress update");
                    }
                }
            }

            // Process the file
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
                    cancellationToken: cancellationToken
                );
                if (searchResults.Results.Count > 0)
                {
                    var movieResult = searchResults.Results[0];
                    var movieDetails = await _tmdbClient.GetMovieAsync(
                        movieResult.Id,
                        cancellationToken: cancellationToken
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

            // Throttle to avoid overwhelming the API
            await Task.Delay(250, cancellationToken);
        }

        if (library.Id is { } libraryId)
        {
            ClearMissingMovieFiles(libraryId);
        }

        return (processed, found);
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Metadata service is starting");

        // Start broadcast timer for scan operations
        _broadcastTimer ??= new Timer(
            async _ =>
            {
                try
                {
                    await BroadcastScanOperationsAsync();
                    CleanupOldScanOperations();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error broadcasting scan operations");
                }
            },
            null,
            TimeSpan.Zero,
            TimeSpan.FromSeconds(1)
        );

        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Metadata service is stopping");

        // Stop broadcast timer
        _broadcastTimer?.Change(Timeout.Infinite, Timeout.Infinite);
        _broadcastTimer?.Dispose();
        _broadcastTimer = null;

        // Cancel all active scan operations
        foreach (var cancellationTokenSource in _cancellationTokens.Values)
        {
            try
            {
                cancellationTokenSource.Cancel();
                cancellationTokenSource.Dispose();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cancelling scan operation");
            }
        }

        _cancellationTokens.Clear();
        return Task.CompletedTask;
    }

    private async Task BroadcastScanOperationsAsync()
    {
        foreach (var operation in _scanOperations.Values)
        {
            await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", operation);
        }
    }

    private void CleanupOldScanOperations()
    {
        var cutoffTime = DateTime.UtcNow.AddMinutes(-5); // Remove operations older than 5 minutes
        var operationsToRemove = _scanOperations
            .Values.Where(op =>
                op.State != ScanOperationState.Running
                && op.CompletedTime.HasValue
                && op.CompletedTime.Value < cutoffTime
            )
            .Select(op => op.Id)
            .ToList();

        foreach (var operationId in operationsToRemove)
        {
            _scanOperations.TryRemove(operationId, out _);
        }
    }
}
