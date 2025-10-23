using Haas.Media.Core.BackgroundTasks;
using LiteDB;
using TMDbLib.Client;

namespace Haas.Media.Services.Metadata;

public class MetadataService : IMetadataApi
{
    private readonly ILiteCollection<LibraryInfo> _librariesCollection;
    private readonly ILiteCollection<MovieMetadata> _movieMetadataCollection;
    private readonly ILiteCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILiteCollection<FileMetadata> _fileMetadataCollection;
    private readonly ILiteCollection<PersonMetadata> _personMetadataCollection;
    private readonly ILiteCollection<FilePlaybackInfo> _playbackInfoCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;
    private readonly IBackgroundTaskManager _backgroundTaskManager;
    private readonly ITmdbLanguageProvider _languageProvider;

    public MetadataService(
        ILogger<MetadataService> logger,
        LiteDatabase database,
        IBackgroundTaskManager backgroundTaskManager,
        TMDbClient tmdbClient,
        ITmdbLanguageProvider languageProvider
    )
    {
        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _fileMetadataCollection = database.GetCollection<FileMetadata>("fileMetadata");
        _personMetadataCollection = database.GetCollection<PersonMetadata>("personMetadata");
        _playbackInfoCollection = database.GetCollection<FilePlaybackInfo>("filePlaybackInfo");
        _logger = logger;
        _backgroundTaskManager = backgroundTaskManager;

        _tmdbClient = tmdbClient;
        _languageProvider = languageProvider;

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
        List<MovieMetadata> movieMetadata;

        if (string.IsNullOrWhiteSpace(libraryId))
        {
            movieMetadata = _movieMetadataCollection.FindAll().ToList();
        }
        else
        {
            var movieIds = _fileMetadataCollection
                .Find(f => f.LibraryId == libraryId && f.MediaType == LibraryType.Movies)
                .Select(f => f.MediaId)
                .Distinct()
                .ToList();

            movieMetadata = new List<MovieMetadata>(movieIds.Count);

            foreach (var movieId in movieIds)
            {
                var movie = _movieMetadataCollection.FindById(new BsonValue(movieId));
                if (movie is not null)
                {
                    movieMetadata.Add(movie);
                }
            }
        }

        _logger.LogDebug("Retrieved {Count} movie metadata records", movieMetadata.Count);
        return Task.FromResult<IEnumerable<MovieMetadata>>(movieMetadata);
    }

    public Task<MovieMetadata?> GetMovieMetadataByIdAsync(int id)
    {
        var movieMetadata = _movieMetadataCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved movie metadata with ID: {Id}", id);
        return Task.FromResult<MovieMetadata?>(movieMetadata);
    }

    public Task<bool> DeleteMovieMetadataAsync(int id)
    {
        // First, get the movie to collect person IDs
        var movie = _movieMetadataCollection.FindById(new BsonValue(id));
        if (movie == null)
        {
            _logger.LogWarning("Movie metadata not found with ID: {Id}", id);
            return Task.FromResult(false);
        }

        // Collect all person IDs from cast and crew
        var personIds = new HashSet<int>();
        foreach (var castMember in movie.Cast)
        {
            personIds.Add(castMember.Id);
        }
        foreach (var crewMember in movie.Crew)
        {
            personIds.Add(crewMember.Id);
        }

        // Delete the movie
        var deleted = _movieMetadataCollection.Delete(new BsonValue(id));
        if (deleted)
        {
            _logger.LogInformation("Deleted movie metadata with ID: {Id}", id);

            // Queue person cleanup as a background task
            if (personIds.Count > 0)
            {
                var task = new PersonCleanupTask { PersonIds = personIds.ToArray() };
                _backgroundTaskManager.RunTask<PersonCleanupTask, PersonCleanupOperationInfo>(task);
                _logger.LogDebug(
                    "Queued person cleanup task for {Count} people from deleted movie {Id}",
                    personIds.Count,
                    id
                );
            }

            return Task.FromResult(true);
        }

        _logger.LogWarning("Failed to delete movie metadata with ID: {Id}", id);
        return Task.FromResult(false);
    }

    public Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null)
    {
        List<TVShowMetadata> tvShowMetadata;

        if (string.IsNullOrWhiteSpace(libraryId))
        {
            tvShowMetadata = _tvShowMetadataCollection.FindAll().ToList();
        }
        else
        {
            var tvShowIds = _fileMetadataCollection
                .Find(f => f.LibraryId == libraryId && f.MediaType == LibraryType.TVShows)
                .Select(f => f.MediaId)
                .Distinct()
                .ToList();

            tvShowMetadata = new List<TVShowMetadata>(tvShowIds.Count);

            foreach (var tvShowId in tvShowIds)
            {
                var tvShow = _tvShowMetadataCollection.FindById(new BsonValue(tvShowId));
                if (tvShow is not null)
                {
                    tvShowMetadata.Add(tvShow);
                }
            }
        }

        _logger.LogDebug("Retrieved {Count} TV show metadata records", tvShowMetadata.Count);
        return Task.FromResult<IEnumerable<TVShowMetadata>>(tvShowMetadata);
    }

    public Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(int id)
    {
        var tvShowMetadata = _tvShowMetadataCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved TV show metadata with ID: {Id}", id);
        return Task.FromResult<TVShowMetadata?>(tvShowMetadata);
    }

    public Task<bool> DeleteTVShowMetadataAsync(int id)
    {
        // First, get the TV show to collect person IDs
        var tvShow = _tvShowMetadataCollection.FindById(new BsonValue(id));
        if (tvShow == null)
        {
            _logger.LogWarning("TV show metadata not found with ID: {Id}", id);
            return Task.FromResult(false);
        }

        // Collect all person IDs from cast, crew, and all episodes
        var personIds = new HashSet<int>();
        foreach (var castMember in tvShow.Cast)
        {
            personIds.Add(castMember.Id);
        }
        foreach (var crewMember in tvShow.Crew)
        {
            personIds.Add(crewMember.Id);
        }

        // Also collect person IDs from all episodes
        foreach (var season in tvShow.Seasons)
        {
            foreach (var episode in season.Episodes)
            {
                foreach (var castMember in episode.Cast)
                {
                    personIds.Add(castMember.Id);
                }
                foreach (var crewMember in episode.Crew)
                {
                    personIds.Add(crewMember.Id);
                }
            }
        }

        // Delete the TV show
        var deleted = _tvShowMetadataCollection.Delete(new BsonValue(id));
        if (deleted)
        {
            _logger.LogInformation("Deleted TV show metadata with ID: {Id}", id);

            // Queue person cleanup as a background task
            if (personIds.Count > 0)
            {
                var task = new PersonCleanupTask { PersonIds = personIds.ToArray() };
                _backgroundTaskManager.RunTask<PersonCleanupTask, PersonCleanupOperationInfo>(task);
                _logger.LogDebug(
                    "Queued person cleanup task for {Count} people from deleted TV show {Id}",
                    personIds.Count,
                    id
                );
            }

            return Task.FromResult(true);
        }

        _logger.LogWarning("Failed to delete TV show metadata with ID: {Id}", id);
        return Task.FromResult(false);
    }

    public async Task<IEnumerable<SearchResult>> SearchAsync(
        string query,
        LibraryType? libraryType = null
    )
    {
        // Search is library-agnostic, so we don't apply a library-specific language preference
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
                            Id = movie.Id,
                            Title = movie.Title ?? string.Empty,
                            OriginalTitle = movie.OriginalTitle ?? string.Empty,
                            Overview = movie.Overview ?? string.Empty,
                            VoteAverage = movie.VoteAverage,
                            VoteCount = movie.VoteCount,
                            Type = LibraryType.Movies,
                            PosterPath = movie.PosterPath,
                            BackdropPath = movie.BackdropPath,
                            ReleaseDate = movie.ReleaseDate,
                            OriginalLanguage = movie.OriginalLanguage
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
                            Id = tvShow.Id,
                            Title = tvShow.Name ?? string.Empty,
                            OriginalTitle = tvShow.OriginalName ?? string.Empty,
                            Overview = tvShow.Overview ?? string.Empty,
                            VoteAverage = tvShow.VoteAverage,
                            VoteCount = tvShow.VoteCount,
                            Type = LibraryType.TVShows,
                            PosterPath = tvShow.PosterPath,
                            BackdropPath = tvShow.BackdropPath,
                            ReleaseDate = tvShow.FirstAirDate,
                            OriginalLanguage = tvShow.OriginalLanguage
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
            request.Id
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

        if (string.IsNullOrWhiteSpace(library.Id))
        {
            throw new InvalidOperationException(
                $"Library '{library.Title}' is missing a valid identifier."
            );
        }

        var task = new AddToLibraryTask(library.Id, library.Type, request.Id, library.Title);
        var taskId = _backgroundTaskManager.RunTask<AddToLibraryTask, AddToLibraryOperationInfo>(
            task
        );

        _logger.LogInformation(
            "Queued add-to-library task {TaskId} for TMDB {TmdbId} in library {LibraryId}",
            taskId,
            request.Id,
            library.Id
        );

        return new AddToLibraryResponse(
            taskId.ToString(),
            "Background add-to-library task started"
        );
    }

    public Task<PaginatedResult<PersonMetadata>> GetPeopleMetadataAsync(
        int skip = 0,
        int take = 100,
        string? query = null
    )
    {
        var normalizedSkip = Math.Max(0, skip);
        var normalizedTake = Math.Clamp(take, 1, 1000);

        var peopleQuery = _personMetadataCollection.Query();
        string? trimmedQuery = null;

        if (!string.IsNullOrWhiteSpace(query))
        {
            trimmedQuery = query.Trim();
            peopleQuery = peopleQuery.Where(p => p.Name.Contains(trimmedQuery));
        }

        var totalCount = peopleQuery.Count();

        var people = peopleQuery
            .OrderByDescending(p => p.Popularity)
            .Skip(normalizedSkip)
            .Limit(normalizedTake)
            .ToList();

        _logger.LogDebug(
            "Retrieved {Count} people (skip: {Skip}, take: {Take}, total: {Total}, query: {Query})",
            people.Count,
            normalizedSkip,
            normalizedTake,
            totalCount,
            trimmedQuery ?? "<none>"
        );

        var result = new PaginatedResult<PersonMetadata>
        {
            Items = people,
            TotalCount = totalCount,
            Skip = normalizedSkip,
            Take = normalizedTake
        };

        return Task.FromResult(result);
    }

    public Task<PersonMetadata?> GetPersonMetadataByIdAsync(int id)
    {
        var personMetadata = _personMetadataCollection.FindById(new BsonValue(id));
        if (personMetadata is not null)
        {
            _logger.LogDebug("Retrieved person metadata with ID: {Id}", id);
        }
        else
        {
            _logger.LogWarning("Person metadata not found with ID: {Id}", id);
        }

        return Task.FromResult<PersonMetadata?>(personMetadata);
    }

    public Task<PersonLibraryCredits?> GetPersonCreditsByIdAsync(int id)
    {
        var associatedMovies = _movieMetadataCollection
            .FindAll()
            .Where(movie =>
                movie.Cast.Any(member => member.Id == id)
                || movie.Crew.Any(member => member.Id == id)
            )
            .OrderByDescending(movie => movie.ReleaseDate ?? DateTime.MinValue)
            .ThenBy(movie => movie.Title)
            .ToList();

        var associatedTvShows = _tvShowMetadataCollection
            .FindAll()
            .Where(show =>
                show.Cast.Any(member => member.Id == id) || show.Crew.Any(member => member.Id == id)
            )
            .OrderByDescending(show => show.VoteAverage)
            .ThenBy(show => show.Title)
            .ToList();

        _logger.LogDebug(
            "Retrieved credits for person {Id}: {MovieCount} movies, {TvShowCount} TV shows",
            id,
            associatedMovies.Count,
            associatedTvShows.Count
        );

        var result = new PersonLibraryCredits
        {
            Movies = associatedMovies,
            TvShows = associatedTvShows
        };

        return Task.FromResult<PersonLibraryCredits?>(result);
    }

    private void ApplyPreferredLanguage()
    {
        var language = _languageProvider.GetPreferredLanguage();
        if (!string.IsNullOrWhiteSpace(language))
        {
            _tmdbClient.DefaultLanguage = language;
        }
    }

    private void CreateIndexes()
    {
        _librariesCollection.EnsureIndex(x => x.DirectoryPath, true);
        _librariesCollection.EnsureIndex(x => x.Title);

        _movieMetadataCollection.EnsureIndex(x => x.Title);

        _tvShowMetadataCollection.EnsureIndex(x => x.Title);

        _fileMetadataCollection.EnsureIndex(x => x.LibraryId);
        _fileMetadataCollection.EnsureIndex(x => x.MediaId);
        _fileMetadataCollection.EnsureIndex(x => x.FilePath);
        _fileMetadataCollection.EnsureIndex(x => x.MediaType);
        _fileMetadataCollection.EnsureIndex(x => new { x.LibraryId, x.MediaId });
        _personMetadataCollection.EnsureIndex(x => x.Name);

        _playbackInfoCollection.EnsureIndex("idx_userId", x => x.UserId, false);
        _playbackInfoCollection.EnsureIndex("idx_fileMetadataId", x => x.FileMetadataId, false);
        _playbackInfoCollection.EnsureIndex(
            "idx_user_file",
            x => new { x.UserId, x.FileMetadataId },
            false
        );

        _logger.LogDebug(
            "Created indexes for libraries, movie metadata, TV show metadata, person metadata, file metadata, and playback info collections"
        );
    }

    public Task<string> StartScanLibrariesAsync()
    {
        var task = new MetadataScanTask();
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

    public Task<string> StartRefreshMetadataAsync(
        bool refreshMovies = true,
        bool refreshTvShows = true,
        bool refreshPeople = true
    )
    {
        var task = new MetadataRefreshTask
        {
            RefreshMovies = refreshMovies,
            RefreshTvShows = refreshTvShows,
            RefreshPeople = refreshPeople
        };
        var operationId = task.Id.ToString();

        _logger.LogInformation(
            "Starting metadata refresh operation with ID: {OperationId} (Movies: {RefreshMovies}, TV Shows: {RefreshTvShows}, People: {RefreshPeople})",
            operationId,
            refreshMovies,
            refreshTvShows,
            refreshPeople
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

    // File Metadata operations
    public Task<IEnumerable<FileMetadata>> GetFileMetadataAsync(
        string? libraryId = null,
        int? mediaId = null
    )
    {
        IEnumerable<FileMetadata> results;

        if (!string.IsNullOrWhiteSpace(libraryId) && mediaId.HasValue)
        {
            results = _fileMetadataCollection.Find(f =>
                f.LibraryId == libraryId && f.MediaId == mediaId.Value
            );
        }
        else if (!string.IsNullOrWhiteSpace(libraryId))
        {
            results = _fileMetadataCollection.Find(f => f.LibraryId == libraryId);
        }
        else if (mediaId.HasValue)
        {
            results = _fileMetadataCollection.Find(f => f.MediaId == mediaId.Value);
        }
        else
        {
            results = _fileMetadataCollection.FindAll();
        }

        var fileMetadata = results.ToList();
        _logger.LogDebug("Retrieved {Count} file metadata records", fileMetadata.Count);
        return Task.FromResult<IEnumerable<FileMetadata>>(fileMetadata);
    }

    public Task<FileMetadata?> GetFileMetadataByIdAsync(string id)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            _logger.LogWarning("Invalid ID format: {Id}", id);
            return Task.FromResult<FileMetadata?>(null);
        }

        var fileMetadata = _fileMetadataCollection.FindById(new BsonValue(id));
        _logger.LogDebug("Retrieved file metadata with ID: {Id}", id);
        return Task.FromResult<FileMetadata?>(fileMetadata);
    }

    public Task<FileMetadata> AddFileMetadataAsync(FileMetadata fileMetadata)
    {
        fileMetadata.Id = ObjectId.NewObjectId().ToString();
        fileMetadata.UpdatedAt = DateTime.UtcNow;

        _fileMetadataCollection.Insert(fileMetadata);
        _logger.LogInformation(
            "Added new file metadata: MediaId={MediaId}, FilePath={FilePath}",
            fileMetadata.MediaId,
            fileMetadata.FilePath
        );
        return Task.FromResult(fileMetadata);
    }

    public Task<bool> DeleteFileMetadataAsync(string id)
    {
        var deleted = _fileMetadataCollection.Delete(new BsonValue(id));
        if (deleted)
        {
            _logger.LogInformation("Deleted file metadata with ID: {Id}", id);
            return Task.FromResult(true);
        }

        _logger.LogWarning("File metadata not found with ID: {Id}", id);
        return Task.FromResult(false);
    }

    public Task<IEnumerable<FileMetadata>> GetFilesByMediaIdAsync(
        int mediaId,
        LibraryType mediaType
    )
    {
        var results = _fileMetadataCollection.Find(f =>
            f.MediaId == mediaId && f.MediaType == mediaType
        );
        var fileMetadata = results.ToList();
        _logger.LogDebug(
            "Retrieved {Count} files for media ID: {MediaId}",
            fileMetadata.Count,
            mediaId
        );
        return Task.FromResult<IEnumerable<FileMetadata>>(fileMetadata);
    }

    public Task<FilePlaybackInfo?> GetPlaybackInfoAsync(string userId, string fileMetadataId)
    {
        var id = FilePlaybackInfo.CreateId(userId, fileMetadataId);
        var playbackInfo = _playbackInfoCollection.FindById(new BsonValue(id));
        _logger.LogDebug(
            "Retrieved playback info for User: {UserId}, File: {FileMetadataId}",
            userId,
            fileMetadataId
        );
        return Task.FromResult<FilePlaybackInfo?>(playbackInfo);
    }

    public Task<FilePlaybackInfo> SavePlaybackInfoAsync(FilePlaybackInfo playbackInfo)
    {
        playbackInfo.UpdatedAt = DateTime.UtcNow;

        var existing = _playbackInfoCollection.FindById(new BsonValue(playbackInfo.Id));
        if (existing != null)
        {
            _playbackInfoCollection.Update(playbackInfo);
            _logger.LogDebug(
                "Updated playback info: {Id}, Position: {Position} ticks",
                playbackInfo.Id,
                playbackInfo.PlaybackPositionTicks
            );
        }
        else
        {
            playbackInfo.CreatedAt = DateTime.UtcNow;
            _playbackInfoCollection.Insert(playbackInfo);
            _logger.LogDebug("Created new playback info: {Id}", playbackInfo.Id);
        }

        return Task.FromResult(playbackInfo);
    }

    public Task<bool> DeletePlaybackInfoAsync(string userId, string fileMetadataId)
    {
        var id = FilePlaybackInfo.CreateId(userId, fileMetadataId);
        var deleted = _playbackInfoCollection.Delete(new BsonValue(id));

        if (deleted)
        {
            _logger.LogInformation(
                "Deleted playback info for User: {UserId}, File: {FileMetadataId}",
                userId,
                fileMetadataId
            );
            return Task.FromResult(true);
        }

        _logger.LogWarning(
            "Playback info not found for User: {UserId}, File: {FileMetadataId}",
            userId,
            fileMetadataId
        );
        return Task.FromResult(false);
    }

    public Task<IEnumerable<FilePlaybackInfo>> GetUserPlaybackInfoAsync(string userId)
    {
        var results = _playbackInfoCollection.Find(p => p.UserId == userId);
        var playbackInfos = results.ToList();
        _logger.LogDebug(
            "Retrieved {Count} playback records for user: {UserId}",
            playbackInfos.Count,
            userId
        );
        return Task.FromResult<IEnumerable<FilePlaybackInfo>>(playbackInfos);
    }
}
