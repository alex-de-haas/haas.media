using System.Text.RegularExpressions;
using MongoDB.Bson;
using MongoDB.Driver;
using TMDbLib.Client;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi
{
    private readonly string _dataPath;
    private readonly IMongoCollection<LibraryInfo> _librariesCollection;
    private readonly IMongoCollection<MovieMetadata> _movieMetadataCollection;
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

                var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
                _logger.LogDebug(
                    "Found {Count} media files in library: {Title}",
                    mediaFiles.Count,
                    library.Title
                );

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

                            totalFound++;
                        }
                        else
                        {
                            _logger.LogDebug(
                                "No TMDb results found for movie: {MovieTitle}",
                                movieTitle
                            );
                        }

                        totalProcessed++;

                        // Add small delay to respect TMDb rate limits
                        await Task.Delay(250);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Error processing file: {FilePath}", filePath);
                    }
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

            _logger.LogDebug("Created indexes for libraries and movie metadata collections");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error creating indexes");
        }
    }
}
