using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi
{
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;
    private readonly IBackgroundTaskManager _backgroundTaskManager;

    public MetadataService(
        ILogger<MetadataService> logger,
        LiteDatabase database,
        IBackgroundTaskManager backgroundTaskManager,
        TMDbClient tmdbClient
    )
    {
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

    public async Task<AddToLibraryResponse> AddToLibraryAsync(AddToLibraryRequest request)
    {
        _logger.LogDebug(
            "Queueing add-to-library request: LibraryId={LibraryId}, Type={Type}, TmdbId={TmdbId}",
            request.LibraryId,
            request.Type,
            request.TmdbId
        );

        var library = await GetLibraryAsync(request.LibraryId);
        if (library is null)
        {
            throw new ArgumentException($"Library with ID '{request.LibraryId}' not found.");
        }

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

        if (string.IsNullOrWhiteSpace(library.Id))
        {
            throw new InvalidOperationException(
                $"Library '{library.Title}' is missing a valid identifier."
            );
        }

        var task = new AddToLibraryTask(library.Id, library.Type, tmdbId, library.Title);
        var taskId = _backgroundTaskManager.RunTask<AddToLibraryTask, AddToLibraryOperationInfo>(task);

        _logger.LogInformation(
            "Queued add-to-library task {TaskId} for TMDB {TmdbId} in library {LibraryId}",
            taskId,
            tmdbId,
            library.Id
        );

        return new AddToLibraryResponse(
            taskId.ToString(),
            "Background add-to-library task started"
        );
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

    public Task<string> StartRefreshMetadataAsync()
    {
        var task = new MetadataRefreshTask();
        var operationId = task.Id.ToString();

        _logger.LogInformation(
            "Starting metadata refresh operation with ID: {OperationId}",
            operationId
        );

        try
        {
            _backgroundTaskManager.RunTask<MetadataRefreshTask, MetadataRefreshOperationInfo>(task);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to enqueue metadata refresh operation with ID: {OperationId}",
                operationId
            );
            throw;
        }

        return Task.FromResult(operationId);
    }
}
