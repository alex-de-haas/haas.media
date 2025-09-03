using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using TMDbLib.Client;
using TMDbLib.Objects.Search;
using TMDbLib.Objects.TvShows;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi
{
    private readonly string _dataPath;
    private readonly IMongoCollection<LibraryInfo> _librariesCollection;
    private readonly IMongoCollection<MovieMetadata> _movieMetadataCollection;
    private readonly IMongoCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;

    public MetadataService(
        IConfiguration configuration,
        ILogger<MetadataService> logger,
        IMongoDatabase database
    )
    {
        _dataPath =
            configuration["DATA_DIRECTORY"]
            ?? throw new ArgumentException("DATA_DIRECTORY configuration is required.");

        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _movieMetadataCollection = database.GetCollection<MovieMetadata>("movieMetadata");
        _tvShowMetadataCollection = database.GetCollection<TVShowMetadata>("tvShowMetadata");
        _logger = logger;

        var tmdbApiKey =
            configuration["TMDB_API_KEY"]
            ?? throw new ArgumentException("TMDB_API_KEY configuration is required.");

        _tmdbClient = new TMDbClient(tmdbApiKey);
        _tmdbClient.DefaultLanguage = "en"; // Default language as specified in METADATA.md

        // Create indexes
        CreateIndexes();

        _logger.LogInformation("MetadataService initialized");
    }

    public async Task<IEnumerable<LibraryInfo>> GetLibrariesAsync()
    {
        try
        {
            var libraries = await _librariesCollection.Find(_ => true).ToListAsync();
            _logger.LogDebug("Retrieved {Count} libraries", libraries.Count);
            return libraries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving libraries");
            throw;
        }
    }

    public async Task<LibraryInfo?> GetLibraryAsync(string id)
    {
        try
        {
            if (!ObjectId.TryParse(id, out var objectId))
            {
                _logger.LogWarning("Invalid ObjectId format: {Id}", id);
                return null;
            }

            var library = await _librariesCollection.Find(x => x.Id == id).FirstOrDefaultAsync();
            _logger.LogDebug("Retrieved library with ID: {Id}", id);
            return library;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving library with ID: {Id}", id);
            throw;
        }
    }

    public async Task<LibraryInfo> AddLibraryAsync(LibraryInfo library)
    {
        try
        {
            library.Id = null; // Ensure MongoDB generates the ID
            library.CreatedAt = DateTime.UtcNow;
            library.UpdatedAt = DateTime.UtcNow;

            await _librariesCollection.InsertOneAsync(library);
            _logger.LogInformation(
                "Added new library: {Title} at {DirectoryPath}",
                library.Title,
                library.DirectoryPath
            );
            return library;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding library: {Title}", library.Title);
            throw;
        }
    }

    public async Task<LibraryInfo?> UpdateLibraryAsync(string id, LibraryInfo library)
    {
        try
        {
            if (!ObjectId.TryParse(id, out var objectId))
            {
                _logger.LogWarning("Invalid ObjectId format: {Id}", id);
                return null;
            }

            library.Id = id;
            library.UpdatedAt = DateTime.UtcNow;

            var result = await _librariesCollection.ReplaceOneAsync(x => x.Id == id, library);

            if (result.MatchedCount == 0)
            {
                _logger.LogWarning("Library not found with ID: {Id}", id);
                return null;
            }

            _logger.LogInformation("Updated library: {Title} with ID: {Id}", library.Title, id);
            return library;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating library with ID: {Id}", id);
            throw;
        }
    }

    public async Task<bool> DeleteLibraryAsync(string id)
    {
        try
        {
            if (!ObjectId.TryParse(id, out var objectId))
            {
                _logger.LogWarning("Invalid ObjectId format: {Id}", id);
                return false;
            }

            var result = await _librariesCollection.DeleteOneAsync(x => x.Id == id);

            if (result.DeletedCount > 0)
            {
                _logger.LogInformation("Deleted library with ID: {Id}", id);
                return true;
            }

            _logger.LogWarning("Library not found with ID: {Id}", id);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting library with ID: {Id}", id);
            throw;
        }
    }

    public async Task ScanLibrariesAsync()
    {
        try
        {
            _logger.LogInformation("Starting metadata scan for all libraries");

            var libraries = await GetLibrariesAsync();
            var totalProcessed = 0;
            var totalFound = 0;

            foreach (var library in libraries)
            {
                _logger.LogDebug(
                    "Scanning library: {Title} at {DirectoryPath}",
                    library.Title,
                    library.DirectoryPath
                );

                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);
                if (!Directory.Exists(fullDirectoryPath))
                {
                    _logger.LogWarning(
                        "Library directory does not exist: {DirectoryPath}",
                        fullDirectoryPath
                    );
                    continue;
                }

                if (library.Type == LibraryType.Movies)
                {
                    var (processed, found) = await ScanMovieLibraryAsync(library, fullDirectoryPath);
                    totalProcessed += processed;
                    totalFound += found;
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    var (processed, found) = await ScanTVShowLibraryAsync(library, fullDirectoryPath);
                    totalProcessed += processed;
                    totalFound += found;
                }
            }

            _logger.LogInformation(
                "Completed metadata scan. Processed: {Processed}, Found metadata: {Found}",
                totalProcessed,
                totalFound
            );
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during metadata scan");
            throw;
        }
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

    private string ExtractMovieTitleFromFileName(string fileName)
    {
        try
        {
            // Remove file extension
            var nameWithoutExtension = Path.GetFileNameWithoutExtension(fileName);

            // Common patterns to clean movie titles from file names
            var patterns = new[]
            {
                @"\.\d{4}\.", // Remove year with dots (e.g., .2018.)
                @"\s+\d{4}\s+", // Remove year with spaces
                @"\s+\(\d{4}\)", // Remove year in parentheses
                @"\s*[\[\(].*?[\]\)]", // Remove anything in brackets or parentheses
                @"\s*\d{3,4}p.*", // Remove resolution and everything after (720p, 1080p, etc.)
                @"\s*BluRay.*", // Remove BluRay and everything after
                @"\s*BDRip.*", // Remove BDRip and everything after
                @"\s*WEBRip.*", // Remove WEBRip and everything after
                @"\s*HDRip.*", // Remove HDRip and everything after
                @"\s*DVDRip.*", // Remove DVDRip and everything after
                @"\s*x264.*", // Remove codec and everything after
                @"\s*x265.*", // Remove codec and everything after
                @"\s*H\.?264.*", // Remove codec and everything after
                @"\s*H\.?265.*", // Remove codec and everything after
                @"\s*HEVC.*", // Remove codec and everything after
                @"\s*AAC.*", // Remove audio codec and everything after
                @"\s*AC3.*", // Remove audio codec and everything after
                @"\s*DTS.*", // Remove audio codec and everything after
                @"\s*-.*", // Remove dash and everything after
                @"\s*\[.*", // Remove opening bracket and everything after
                @"\.rus\.", // Remove Russian language marker
                @"\.LostFilm\.TV", // Remove LostFilm.TV marker
                @"S\d{2}E\d{2}", // Remove TV series episode markers
            };

            var cleanedTitle = nameWithoutExtension;

            foreach (var pattern in patterns)
            {
                cleanedTitle = Regex.Replace(cleanedTitle, pattern, " ", RegexOptions.IgnoreCase);
            }

            // Replace dots and underscores with spaces
            cleanedTitle = cleanedTitle.Replace(".", " ").Replace("_", " ");

            // Clean up multiple spaces and trim
            cleanedTitle = Regex.Replace(cleanedTitle, @"\s+", " ").Trim();

            return cleanedTitle;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting title from filename: {FileName}", fileName);
            return fileName;
        }
    }

    private async Task<SearchMovie?> SearchTMDbForMovie(string movieTitle)
    {
        try
        {
            var searchResults = await _tmdbClient.SearchMovieAsync(movieTitle);
            if (searchResults?.Results?.Count > 0)
            {
                // Return the first result with the highest popularity
                return searchResults.Results.OrderByDescending(m => m.Popularity).FirstOrDefault();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TMDb for movie: {MovieTitle}", movieTitle);
            return null;
        }
    }

    private MovieMetadata CreateMovieMetadata(
        SearchMovie tmdbMovie,
        string libraryId,
        string filePath
    )
    {
        try
        {
            return new MovieMetadata
            {
                TmdbId = tmdbMovie.Id,
                OriginalTitle = tmdbMovie.OriginalTitle,
                OriginalLanguage = tmdbMovie.OriginalLanguage,
                Title = tmdbMovie.Title,
                Overview = tmdbMovie.Overview,
                VoteAverage = tmdbMovie.VoteAverage,
                VoteCount = tmdbMovie.VoteCount,
                ReleaseDate = tmdbMovie.ReleaseDate,
                PosterPath = tmdbMovie.PosterPath,
                BackdropPath = tmdbMovie.BackdropPath,
                LibraryId = libraryId,
                FilePath = filePath,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error creating movie metadata for TMDb movie: {MovieId}",
                tmdbMovie.Id
            );
            throw;
        }
    }

    public async Task<IEnumerable<MovieMetadata>> GetMovieMetadataAsync(string? libraryId = null)
    {
        try
        {
            FilterDefinition<MovieMetadata> filter = Builders<MovieMetadata>.Filter.Empty;

            if (!string.IsNullOrEmpty(libraryId))
            {
                filter = Builders<MovieMetadata>.Filter.Eq(m => m.LibraryId, libraryId);
            }

            var movieMetadata = await _movieMetadataCollection.Find(filter).ToListAsync();
            _logger.LogDebug("Retrieved {Count} movie metadata records", movieMetadata.Count);
            return movieMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving movie metadata");
            throw;
        }
    }

    public async Task<MovieMetadata?> GetMovieMetadataByIdAsync(string id)
    {
        try
        {
            if (!ObjectId.TryParse(id, out var objectId))
            {
                _logger.LogWarning("Invalid ObjectId format: {Id}", id);
                return null;
            }

            var movieMetadata = await _movieMetadataCollection
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();
            _logger.LogDebug("Retrieved movie metadata with ID: {Id}", id);
            return movieMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving movie metadata with ID: {Id}", id);
            throw;
        }
    }

    private async Task<(int processed, int found)> ScanMovieLibraryAsync(LibraryInfo library, string fullDirectoryPath)
    {
        var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
        _logger.LogDebug(
            "Found {Count} media files in movie library: {Title}",
            mediaFiles.Count,
            library.Title
        );

        var processed = 0;
        var found = 0;

        foreach (var filePath in mediaFiles)
        {
            try
            {
                var movieTitle = ExtractMovieTitleFromFileName(Path.GetFileName(filePath));
                if (string.IsNullOrEmpty(movieTitle))
                {
                    _logger.LogDebug(
                        "Could not extract movie title from file: {FilePath}",
                        filePath
                    );
                    continue;
                }

                // Check if metadata already exists for this file
                var existingMetadata = await _movieMetadataCollection
                    .Find(m => m.FilePath == filePath)
                    .FirstOrDefaultAsync();

                if (existingMetadata != null)
                {
                    _logger.LogDebug(
                        "Metadata already exists for file: {FilePath}",
                        filePath
                    );
                    continue;
                }

                _logger.LogDebug("Searching TMDb for movie: {MovieTitle}", movieTitle);
                var tmdbResult = await SearchTMDbForMovie(movieTitle);

                if (tmdbResult != null)
                {
                    var movieMetadata = CreateMovieMetadata(
                        tmdbResult,
                        library.Id!,
                        filePath
                    );
                    await _movieMetadataCollection.InsertOneAsync(movieMetadata);

                    _logger.LogInformation(
                        "Added metadata for movie: {Title} ({Year}) - File: {FileName}",
                        movieMetadata.Title,
                        movieMetadata.ReleaseDate?.Year.ToString() ?? "Unknown",
                        Path.GetFileName(filePath)
                    );

                    found++;
                }
                else
                {
                    _logger.LogDebug(
                        "No TMDb results found for movie: {MovieTitle}",
                        movieTitle
                    );
                }

                processed++;

                // Add small delay to respect TMDb rate limits
                await Task.Delay(250);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing movie file: {FilePath}", filePath);
            }
        }

        return (processed, found);
    }

    private async Task<(int processed, int found)> ScanTVShowLibraryAsync(LibraryInfo library, string fullDirectoryPath)
    {
        var showDirectories = Directory.GetDirectories(fullDirectoryPath, "*", SearchOption.TopDirectoryOnly);
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
                var showTitle = ExtractTVShowTitleFromDirectoryName(Path.GetFileName(showDirectory));
                if (string.IsNullOrEmpty(showTitle))
                {
                    _logger.LogDebug(
                        "Could not extract TV show title from directory: {DirectoryPath}",
                        showDirectory
                    );
                    continue;
                }

                // Check if metadata already exists for this show
                var existingMetadata = await _tvShowMetadataCollection
                    .Find(tv => tv.LibraryId == library.Id && tv.Title == showTitle)
                    .FirstOrDefaultAsync();

                if (existingMetadata != null)
                {
                    _logger.LogDebug(
                        "Metadata already exists for TV show: {ShowTitle}",
                        showTitle
                    );
                    continue;
                }

                _logger.LogDebug("Searching TMDb for TV show: {ShowTitle}", showTitle);
                var tmdbResult = await SearchTMDbForTVShow(showTitle);

                if (tmdbResult != null)
                {
                    var tvShowMetadata = await CreateTVShowMetadata(
                        tmdbResult,
                        library.Id!,
                        showDirectory
                    );
                    await _tvShowMetadataCollection.InsertOneAsync(tvShowMetadata);

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

                processed++;

                // Add small delay to respect TMDb rate limits
                await Task.Delay(250);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing TV show directory: {DirectoryPath}", showDirectory);
            }
        }

        return (processed, found);
    }

    private string ExtractTVShowTitleFromDirectoryName(string directoryName)
    {
        try
        {
            // Common patterns to clean TV show titles from directory names
            var patterns = new[]
            {
                @"\s+\d{4}\s*-\s*\d{4}", // Remove year range (e.g., 2020-2023)
                @"\s+\(\d{4}\)", // Remove year in parentheses
                @"\s*[\[\(].*?[\]\)]", // Remove anything in brackets or parentheses
                @"\s*-\s*LostFilm\.TV.*", // Remove LostFilm.TV and everything after
                @"\s*\[.*?\].*", // Remove anything in square brackets and after
                @"\s+S\d{2}.*", // Remove season indicators and everything after
                @"\s+Season\s+\d+.*", // Remove "Season X" and everything after
                @"\s+Complete.*", // Remove "Complete" and everything after
                @"\s*-\s*.*", // Remove dash and everything after (be careful with this)
            };

            var cleanedTitle = directoryName;

            foreach (var pattern in patterns)
            {
                cleanedTitle = Regex.Replace(cleanedTitle, pattern, "", RegexOptions.IgnoreCase);
            }

            // Replace dots and underscores with spaces
            cleanedTitle = cleanedTitle.Replace(".", " ").Replace("_", " ");

            // Clean up multiple spaces and trim
            cleanedTitle = Regex.Replace(cleanedTitle, @"\s+", " ").Trim();

            return cleanedTitle;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting title from directory name: {DirectoryName}", directoryName);
            return directoryName;
        }
    }

    private async Task<SearchTv?> SearchTMDbForTVShow(string tvShowTitle)
    {
        try
        {
            var searchResults = await _tmdbClient.SearchTvShowAsync(tvShowTitle);
            if (searchResults?.Results?.Count > 0)
            {
                // Return the first result with the highest popularity
                return searchResults.Results.OrderByDescending(tv => tv.Popularity).FirstOrDefault();
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
        SearchTv tmdbTvShow,
        string libraryId,
        string showDirectory
    )
    {
        try
        {
            // Get detailed TV show information to access seasons
            var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbTvShow.Id);
            
            var seasons = new List<TVSeasonMetadata>();
            
            // Process each season
            foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0)) // Skip specials (season 0)
            {
                var seasonDetails = await _tmdbClient.GetTvSeasonAsync(tmdbTvShow.Id, season.SeasonNumber);
                var seasonDirectory = Path.Combine(showDirectory, $"Season {season.SeasonNumber}");
                
                var episodes = new List<TVEpisodeMetadata>();
                
                // Process each episode
                foreach (var episode in seasonDetails.Episodes)
                {
                    var filePath = FindEpisodeFile(showDirectory, season.SeasonNumber, episode.EpisodeNumber);
                    if (filePath is null) // Skip if episode file is not found
                        continue;

                    var episodeMetadata = new TVEpisodeMetadata
                    {
                        SeasonNumber = episode.SeasonNumber,
                        EpisodeNumber = episode.EpisodeNumber,
                        Name = episode.Name,
                        Overview = episode.Overview ?? "",
                        VoteAverage = episode.VoteAverage,
                        FilePath = filePath,
                    };
                    
                    episodes.Add(episodeMetadata);
                }
                
                var seasonMetadata = new TVSeasonMetadata
                {
                    SeasonNumber = season.SeasonNumber,
                    Overview = season.Overview ?? "",
                    VoteAverage = seasonDetails.VoteAverage,
                    Episodes = episodes.ToArray(),
                    DirectoryPath = seasonDirectory
                };
                
                seasons.Add(seasonMetadata);
                
                // Add delay between season requests
                await Task.Delay(250);
            }
            
            return new TVShowMetadata
            {
                TmdbId = tmdbTvShow.Id,
                OriginalTitle = tmdbTvShow.OriginalName,
                OriginalLanguage = tmdbTvShow.OriginalLanguage,
                Title = tmdbTvShow.Name,
                Overview = tmdbTvShow.Overview,
                VoteAverage = tmdbTvShow.VoteAverage,
                VoteCount = tmdbTvShow.VoteCount,
                PosterPath = tmdbTvShow.PosterPath,
                BackdropPath = tmdbTvShow.BackdropPath,
                Seasons = seasons.ToArray(),
                LibraryId = libraryId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Error creating TV show metadata for TMDb show: {ShowId}",
                tmdbTvShow.Id
            );
            throw;
        }
    }

    private string? FindEpisodeFile(string showDirectory, int seasonNumber, int episodeNumber)
    {
        try
        {
            var mediaExtensions = new[] { ".mp4", ".mkv", ".avi", ".mov", ".m4v", ".wmv", ".flv", ".webm" };
            
            // Look for episode files in various patterns
            var patterns = new[]
            {
                $"*S{seasonNumber:D2}E{episodeNumber:D2}*",
                $"*S{seasonNumber}E{episodeNumber}*",
                $"*Season {seasonNumber}*Episode {episodeNumber}*",
                $"*{seasonNumber}x{episodeNumber:D2}*"
            };
            
            foreach (var pattern in patterns)
            {
                var files = Directory.GetFiles(showDirectory, pattern, SearchOption.AllDirectories)
                    .Where(file => mediaExtensions.Contains(Path.GetExtension(file).ToLowerInvariant()))
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
            _logger.LogError(ex, "Error finding episode file for S{Season}E{Episode}", seasonNumber, episodeNumber);
            return null;
        }
    }

    public async Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null)
    {
        try
        {
            FilterDefinition<TVShowMetadata> filter = Builders<TVShowMetadata>.Filter.Empty;

            if (!string.IsNullOrEmpty(libraryId))
            {
                filter = Builders<TVShowMetadata>.Filter.Eq(tv => tv.LibraryId, libraryId);
            }

            var tvShowMetadata = await _tvShowMetadataCollection.Find(filter).ToListAsync();
            _logger.LogDebug("Retrieved {Count} TV show metadata records", tvShowMetadata.Count);
            return tvShowMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving TV show metadata");
            throw;
        }
    }

    public async Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(string id)
    {
        try
        {
            if (!ObjectId.TryParse(id, out var objectId))
            {
                _logger.LogWarning("Invalid ObjectId format: {Id}", id);
                return null;
            }

            var tvShowMetadata = await _tvShowMetadataCollection
                .Find(x => x.Id == id)
                .FirstOrDefaultAsync();
            _logger.LogDebug("Retrieved TV show metadata with ID: {Id}", id);
            return tvShowMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving TV show metadata with ID: {Id}", id);
            throw;
        }
    }

    private void CreateIndexes()
    {
        try
        {
            // Create indexes for libraries collection
            var directoryPathIndex = new CreateIndexModel<LibraryInfo>(
                Builders<LibraryInfo>.IndexKeys.Ascending(x => x.DirectoryPath),
                new CreateIndexOptions { Unique = true }
            );

            var titleIndex = new CreateIndexModel<LibraryInfo>(
                Builders<LibraryInfo>.IndexKeys.Ascending(x => x.Title)
            );

            _librariesCollection.Indexes.CreateMany([directoryPathIndex, titleIndex]);

            // Create indexes for movie metadata collection
            var filePathIndex = new CreateIndexModel<MovieMetadata>(
                Builders<MovieMetadata>.IndexKeys.Ascending(x => x.FilePath),
                new CreateIndexOptions { Unique = true }
            );

            var libraryIdIndex = new CreateIndexModel<MovieMetadata>(
                Builders<MovieMetadata>.IndexKeys.Ascending(x => x.LibraryId)
            );

            var tmdbIdIndex = new CreateIndexModel<MovieMetadata>(
                Builders<MovieMetadata>.IndexKeys.Ascending(x => x.TmdbId)
            );

            var movieTitleIndex = new CreateIndexModel<MovieMetadata>(
                Builders<MovieMetadata>.IndexKeys.Ascending(x => x.Title)
            );

            _movieMetadataCollection.Indexes.CreateMany(
                [filePathIndex, libraryIdIndex, tmdbIdIndex, movieTitleIndex]
            );

            // Create indexes for TV show metadata collection
            var tvLibraryIdIndex = new CreateIndexModel<TVShowMetadata>(
                Builders<TVShowMetadata>.IndexKeys.Ascending(x => x.LibraryId)
            );

            var tvTmdbIdIndex = new CreateIndexModel<TVShowMetadata>(
                Builders<TVShowMetadata>.IndexKeys.Ascending(x => x.TmdbId)
            );

            var tvTitleIndex = new CreateIndexModel<TVShowMetadata>(
                Builders<TVShowMetadata>.IndexKeys.Ascending(x => x.Title)
            );

            _tvShowMetadataCollection.Indexes.CreateMany(
                [tvLibraryIdIndex, tvTmdbIdIndex, tvTitleIndex]
            );

            _logger.LogDebug("Created indexes for libraries, movie metadata, and TV show metadata collections");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error creating indexes");
        }
    }

    /// <summary>
    /// Gets the full URL for a TMDB image poster (w500 size)
    /// </summary>
    /// <param name="posterPath">The relative poster path from TMDB</param>
    /// <returns>Full image URL or null if path is null/empty</returns>
    public static string? GetPosterUrl(string? posterPath)
    {
        if (string.IsNullOrEmpty(posterPath))
            return null;
        
        return $"https://image.tmdb.org/t/p/w500{posterPath}";
    }

    /// <summary>
    /// Gets the full URL for a TMDB backdrop image (w1280 size)
    /// </summary>
    /// <param name="backdropPath">The relative backdrop path from TMDB</param>
    /// <returns>Full image URL or null if path is null/empty</returns>
    public static string? GetBackdropUrl(string? backdropPath)
    {
        if (string.IsNullOrEmpty(backdropPath))
            return null;
        
        return $"https://image.tmdb.org/t/p/w1280{backdropPath}";
    }
}
