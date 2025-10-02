using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi
{
    private const string MetadataScanTaskName = "Metadata library scan";
    private readonly string _dataPath;
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;
    private readonly IBackgroundTaskManager _backgroundTaskManager;

    public MetadataService(
        IConfiguration configuration,
        ILogger<MetadataService> logger,
        LiteDatabase database,
        IBackgroundTaskManager backgroundTaskManager,
        TMDbClient tmdbClient
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _logger = logger;
        _backgroundTaskManager = backgroundTaskManager;

        _tmdbClient = tmdbClient;

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
        var networks =
            tvShowDetails.Networks?.Select(n => n.Map()).ToArray() ?? Array.Empty<Network>();

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

    public Task<string> StartScanLibrariesAsync(bool refreshExisting = true)
    {
        var task = new MetadataScanTask(refreshExisting);
        var operationId = task.Id.ToString();
        _logger.LogInformation(
            "Starting background scan operation with ID: {OperationId}",
            operationId
        );

        try
        {
            _backgroundTaskManager.RunTask<MetadataScanTask, ScanOperationInfo>(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to enqueue scan operation with ID: {OperationId}",
                operationId
            );
            throw;
        }

        return Task.FromResult(operationId);
    }
}
