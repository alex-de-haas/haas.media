using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;
using MongoDB.Bson;
using MongoDB.Driver;
using TMDbLib.Client;
using TMDbLib.Objects.Search;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi, IHostedService
{
    private readonly string _dataPath;
    private readonly IMongoCollection<LibraryInfo> _librariesCollection;
    private readonly IMongoCollection<MovieMetadata> _movieMetadataCollection;
    private readonly IMongoCollection<TVShowMetadata> _tvShowMetadataCollection;
    private readonly ILogger<MetadataService> _logger;
    private readonly TMDbClient _tmdbClient;
    private readonly IHubContext<MetadataHub> _hubContext;
    private readonly ConcurrentDictionary<string, ScanOperationInfo> _scanOperations;
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens;
    private Timer? _broadcastTimer;

    public MetadataService(
        IConfiguration configuration,
        ILogger<MetadataService> logger,
        IMongoDatabase database,
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

    public async Task ScanLibrariesAsync(bool refreshExisting = true)
    {
        try
        {
            _logger.LogInformation(
                "Starting metadata scan for all libraries (refreshExisting: {RefreshExisting})", 
                refreshExisting
            );

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
                    var (processed, found) = await ScanMovieLibraryAsync(library, fullDirectoryPath, refreshExisting);
                    totalProcessed += processed;
                    totalFound += found;
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    var (processed, found) = await ScanTVShowLibraryAsync(library, fullDirectoryPath, refreshExisting);
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

    private async Task<MovieMetadata> CreateMovieMetadata(
        SearchMovie tmdbMovie,
        string libraryId,
        string filePath
    )
    {
        try
        {
            // Get detailed movie information to access genres
            var movieDetails = await _tmdbClient.GetMovieAsync(tmdbMovie.Id);
            
            // Get movie credits to access crew and cast information
            var movieCredits = await _tmdbClient.GetMovieCreditsAsync(tmdbMovie.Id);
            
            // Convert crew to our CrewMember format
            var crew = movieCredits.Crew?
                .Select(c => new CrewMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Job = c.Job,
                    Department = c.Department,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CrewMember>();
            
            // Convert cast to our CastMember format
            var cast = movieCredits.Cast?
                .Select(c => new CastMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Character = c.Character ?? "",
                    Order = c.Order,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CastMember>();
            
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
                Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>(),
                Crew = crew,
                Cast = cast,
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

    private async Task<(int processed, int found)> ScanMovieLibraryAsync(LibraryInfo library, string fullDirectoryPath, bool refreshExisting = true)
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
                    if (!refreshExisting)
                    {
                        _logger.LogDebug(
                            "Metadata already exists for file: {FilePath} (skipping due to refreshExisting=false)",
                            filePath
                        );
                        continue;
                    }

                    _logger.LogDebug(
                        "Updating existing metadata for file: {FilePath}",
                        filePath
                    );
                    
                    // Get fresh metadata from TMDb
                    var updatedTmdbResult = await SearchTMDbForMovie(movieTitle);
                    if (updatedTmdbResult != null)
                    {
                        var updatedMovieMetadata = await CreateMovieMetadata(
                            updatedTmdbResult,
                            library.Id!,
                            filePath
                        );
                        
                        // Preserve the original ID and CreatedAt timestamp
                        updatedMovieMetadata.Id = existingMetadata.Id;
                        updatedMovieMetadata.CreatedAt = existingMetadata.CreatedAt;
                        updatedMovieMetadata.UpdatedAt = DateTime.UtcNow;

                        await _movieMetadataCollection.ReplaceOneAsync(
                            m => m.Id == existingMetadata.Id,
                            updatedMovieMetadata
                        );

                        _logger.LogInformation(
                            "Updated metadata for movie: {Title} ({Year}) - File: {FileName}",
                            updatedMovieMetadata.Title,
                            updatedMovieMetadata.ReleaseDate?.Year.ToString() ?? "Unknown",
                            Path.GetFileName(filePath)
                        );

                        found++;
                    }
                    else
                    {
                        _logger.LogDebug(
                            "No TMDb results found for movie: {MovieTitle} (existing file)",
                            movieTitle
                        );
                    }

                    processed++;
                    await Task.Delay(250);
                    continue;
                }

                _logger.LogDebug("Searching TMDb for movie: {MovieTitle}", movieTitle);
                var tmdbResult = await SearchTMDbForMovie(movieTitle);

                if (tmdbResult != null)
                {
                    var movieMetadata = await CreateMovieMetadata(
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

    private async Task<(int processed, int found)> ScanTVShowLibraryAsync(LibraryInfo library, string fullDirectoryPath, bool refreshExisting = true)
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
                            updatedTmdbResult,
                            library.Id!,
                            showDirectory
                        );
                        
                        // Preserve the original ID and CreatedAt timestamp
                        updatedTvShowMetadata.Id = existingMetadata.Id;
                        updatedTvShowMetadata.CreatedAt = existingMetadata.CreatedAt;
                        updatedTvShowMetadata.UpdatedAt = DateTime.UtcNow;

                        await _tvShowMetadataCollection.ReplaceOneAsync(
                            tv => tv.Id == existingMetadata.Id,
                            updatedTvShowMetadata
                        );

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
            
            // Get TV show credits to access crew and cast information
            var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(tmdbTvShow.Id);
            
            // Convert crew to our CrewMember format
            var crew = tvShowCredits.Crew?
                .Select(c => new CrewMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Job = c.Job,
                    Department = c.Department,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CrewMember>();
            
            // Convert cast to our CastMember format
            var cast = tvShowCredits.Cast?
                .Select(c => new CastMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Character = c.Character ?? "",
                    Order = c.Order,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CastMember>();
            
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
                    PosterPath = season.PosterPath,
                    VoteAverage = seasonDetails.VoteAverage,
                    Episodes = episodes.ToArray(),
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
                Genres = tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>(),
                Crew = crew,
                Cast = cast,
                PosterPath = tmdbTvShow.PosterPath,
                BackdropPath = tmdbTvShow.BackdropPath,
                Seasons = seasons.ToArray(),
                LibraryId = libraryId,
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

    public async Task<IEnumerable<SearchResult>> SearchAsync(string query, LibraryType? libraryType = null)
    {
        try
        {
            _logger.LogDebug("Searching TMDB for query: {Query}, libraryType: {LibraryType}", query, libraryType);
            
            var searchResults = new List<SearchResult>();
            
            // If libraryType is not specified or is Movies, search for movies
            if (libraryType == null || libraryType == LibraryType.Movies)
            {
                var movieResults = await _tmdbClient.SearchMovieAsync(query);
                if (movieResults?.Results != null)
                {
                    foreach (var movie in movieResults.Results.Take(10)) // Limit to 10 results
                    {
                        searchResults.Add(new SearchResult
                        {
                            Title = movie.Title ?? string.Empty,
                            OriginalTitle = movie.OriginalTitle ?? string.Empty,
                            Overview = movie.Overview ?? string.Empty,
                            VoteAverage = movie.VoteAverage,
                            VoteCount = movie.VoteCount,
                            PosterPath = movie.PosterPath,
                            BackdropPath = movie.BackdropPath
                        });
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
                        searchResults.Add(new SearchResult
                        {
                            Title = tvShow.Name ?? string.Empty,
                            OriginalTitle = tvShow.OriginalName ?? string.Empty,
                            Overview = tvShow.Overview ?? string.Empty,
                            VoteAverage = tvShow.VoteAverage,
                            VoteCount = tvShow.VoteCount,
                            PosterPath = tvShow.PosterPath,
                            BackdropPath = tvShow.BackdropPath
                        });
                    }
                }
            }
            
            _logger.LogDebug("Found {Count} search results for query: {Query}", searchResults.Count, query);
            return searchResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching TMDB for query: {Query}", query);
            throw;
        }
    }

    public async Task<object> AddToLibraryAsync(AddToLibraryRequest request)
    {
        try
        {
            _logger.LogDebug("Adding to library: LibraryId={LibraryId}, Type={Type}, TmdbId={TmdbId}", 
                request.LibraryId, request.Type, request.TmdbId);

            // Validate that the library exists
            var library = await GetLibraryAsync(request.LibraryId);
            if (library == null)
            {
                throw new ArgumentException($"Library with ID '{request.LibraryId}' not found.");
            }

            // Validate that the library type matches the request type
            if (library.Type != request.Type)
            {
                throw new ArgumentException($"Library type mismatch. Library is of type {library.Type}, but request is for {request.Type}.");
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding to library: LibraryId={LibraryId}, Type={Type}, TmdbId={TmdbId}", 
                request.LibraryId, request.Type, request.TmdbId);
            throw;
        }
    }

    private async Task<MovieMetadata> AddMovieToLibraryAsync(string libraryId, int tmdbId)
    {
        try
        {
            // Check if movie already exists in the library
            var existingMovie = await _movieMetadataCollection
                .Find(m => m.LibraryId == libraryId && m.TmdbId == tmdbId)
                .FirstOrDefaultAsync();

            if (existingMovie != null)
            {
                throw new InvalidOperationException($"Movie with TMDB ID {tmdbId} already exists in library {libraryId}.");
            }

            // Get movie details from TMDB
            var movieDetails = await _tmdbClient.GetMovieAsync(tmdbId);
            if (movieDetails == null)
            {
                throw new ArgumentException($"Movie with TMDB ID {tmdbId} not found on TMDB.");
            }

            // Get movie credits to access crew and cast information
            var movieCredits = await _tmdbClient.GetMovieCreditsAsync(tmdbId);
            
            // Convert crew to our CrewMember format
            var crew = movieCredits.Crew?
                .Select(c => new CrewMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Job = c.Job,
                    Department = c.Department,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CrewMember>();
            
            // Convert cast to our CastMember format
            var cast = movieCredits.Cast?
                .Select(c => new CastMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Character = c.Character ?? "",
                    Order = c.Order,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CastMember>();

            var movieMetadata = new MovieMetadata
            {
                Id = ObjectId.GenerateNewId().ToString(),
                LibraryId = libraryId,
                TmdbId = tmdbId,
                Title = movieDetails.Title ?? "",
                OriginalTitle = movieDetails.OriginalTitle ?? "",
                Overview = movieDetails.Overview ?? "",
                ReleaseDate = movieDetails.ReleaseDate,
                VoteAverage = movieDetails.VoteAverage,
                VoteCount = movieDetails.VoteCount,
                Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>(),
                PosterPath = movieDetails.PosterPath,
                BackdropPath = movieDetails.BackdropPath,
                OriginalLanguage = movieDetails.OriginalLanguage ?? "",
                Crew = crew,
                Cast = cast,
                FilePath = null, // No file path for manually added items
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _movieMetadataCollection.InsertOneAsync(movieMetadata);
            
            _logger.LogInformation("Successfully added movie '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}", 
                movieMetadata.Title, tmdbId, libraryId);

            return movieMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding movie to library: LibraryId={LibraryId}, TmdbId={TmdbId}", 
                libraryId, tmdbId);
            throw;
        }
    }

    private async Task<TVShowMetadata> AddTVShowToLibraryAsync(string libraryId, int tmdbId)
    {
        try
        {
            // Check if TV show already exists in the library
            var existingTVShow = await _tvShowMetadataCollection
                .Find(tv => tv.LibraryId == libraryId && tv.TmdbId == tmdbId)
                .FirstOrDefaultAsync();

            if (existingTVShow != null)
            {
                throw new InvalidOperationException($"TV show with TMDB ID {tmdbId} already exists in library {libraryId}.");
            }

            // Get TV show details from TMDB
            var tvShowDetails = await _tmdbClient.GetTvShowAsync(tmdbId);
            if (tvShowDetails == null)
            {
                throw new ArgumentException($"TV show with TMDB ID {tmdbId} not found on TMDB.");
            }

            // Get TV show credits to access crew and cast information
            var tvShowCredits = await _tmdbClient.GetTvShowCreditsAsync(tmdbId);
            
            // Convert crew to our CrewMember format
            var crew = tvShowCredits.Crew?
                .Select(c => new CrewMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Job = c.Job,
                    Department = c.Department,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CrewMember>();
            
            // Convert cast to our CastMember format
            var cast = tvShowCredits.Cast?
                .Select(c => new CastMember
                {
                    Id = c.Id,
                    Name = c.Name,
                    Character = c.Character ?? "",
                    Order = c.Order,
                    ProfilePath = c.ProfilePath
                })
                .ToArray() ?? Array.Empty<CastMember>();

            var seasons = new List<TVSeasonMetadata>();
            
            // Process each season (skip specials - season 0)
            foreach (var season in tvShowDetails.Seasons.Where(s => s.SeasonNumber > 0))
            {
                var episodes = new List<TVEpisodeMetadata>();
                
                // Get season details to access episodes
                var seasonDetails = await _tmdbClient.GetTvSeasonAsync(tmdbId, season.SeasonNumber);
                
                foreach (var episode in seasonDetails.Episodes)
                {
                    var episodeMetadata = new TVEpisodeMetadata
                    {
                        SeasonNumber = season.SeasonNumber,
                        EpisodeNumber = episode.EpisodeNumber,
                        Name = episode.Name ?? "",
                        Overview = episode.Overview ?? "",
                        VoteAverage = episode.VoteAverage,
                        FilePath = null // No file path for manually added items
                    };
                    
                    episodes.Add(episodeMetadata);
                }
                
                var seasonMetadata = new TVSeasonMetadata
                {
                    SeasonNumber = season.SeasonNumber,
                    Overview = season.Overview ?? "",
                    VoteAverage = 0.0, // Default value since season details don't include vote average
                    PosterPath = season.PosterPath,
                    Episodes = episodes.ToArray()
                };
                
                seasons.Add(seasonMetadata);
            }

            var tvShowMetadata = new TVShowMetadata
            {
                Id = ObjectId.GenerateNewId().ToString(),
                LibraryId = libraryId,
                TmdbId = tmdbId,
                Title = tvShowDetails.Name ?? "",
                OriginalTitle = tvShowDetails.OriginalName ?? "",
                Overview = tvShowDetails.Overview ?? "",
                VoteAverage = tvShowDetails.VoteAverage,
                VoteCount = tvShowDetails.VoteCount,
                Genres = tvShowDetails.Genres?.Select(g => g.Name).ToArray() ?? Array.Empty<string>(),
                PosterPath = tvShowDetails.PosterPath,
                BackdropPath = tvShowDetails.BackdropPath,
                OriginalLanguage = tvShowDetails.OriginalLanguage ?? "",
                Crew = crew,
                Cast = cast,
                Seasons = seasons.ToArray(),
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            await _tvShowMetadataCollection.InsertOneAsync(tvShowMetadata);
            
            _logger.LogInformation("Successfully added TV show '{Title}' (TMDB ID: {TmdbId}) to library {LibraryId}", 
                tvShowMetadata.Title, tmdbId, libraryId);

            return tvShowMetadata;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding TV show to library: LibraryId={LibraryId}, TmdbId={TmdbId}", 
                libraryId, tmdbId);
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

    public async Task<string> StartScanLibrariesAsync(bool refreshExisting = true)
    {
        var operationId = Guid.NewGuid().ToString();
        _logger.LogInformation("Starting background scan operation with ID: {OperationId}", operationId);
        
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
        _ = Task.Run(async () => await PerformScanOperationAsync(operationId, refreshExisting, cancellationTokenSource.Token));

        // Broadcast initial operation state
        try
        {
            await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", scanOperation);
            _logger.LogDebug("Broadcasted initial scan operation state for ID: {OperationId}", operationId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to broadcast initial scan operation state for ID: {OperationId}", operationId);
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

    private async Task PerformScanOperationAsync(string operationId, bool refreshExisting, CancellationToken cancellationToken)
    {
        try
        {
            _logger.LogInformation("Starting background metadata scan operation: {OperationId}", operationId);

            var libraries = await GetLibrariesAsync();
            var allFiles = new List<(LibraryInfo library, List<string> files)>();
            var totalFiles = 0;

            // First pass: count all files
            foreach (var library in libraries)
            {
                var fullDirectoryPath = Path.Combine(_dataPath, library.DirectoryPath);
                if (!Directory.Exists(fullDirectoryPath))
                {
                    _logger.LogWarning("Library directory does not exist: {DirectoryPath}", fullDirectoryPath);
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
                        CurrentFile = $"Scanning {library.Title}..."
                    };
                    _scanOperations.TryUpdate(operationId, libOperation, operation);
                    await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", libOperation);
                }

                int libraryProcessed = 0;
                int libraryFound = 0;

                if (library.Type == LibraryType.Movies)
                {
                    (libraryProcessed, libraryFound) = await ScanMovieLibraryWithProgressAsync(
                        operationId, library, fullDirectoryPath, refreshExisting, processedFiles, totalFiles, cancellationToken);
                }
                else if (library.Type == LibraryType.TVShows)
                {
                    // For TV shows, use the existing non-progress method as it has different scanning logic
                    (libraryProcessed, libraryFound) = await ScanTVShowLibraryAsync(library, fullDirectoryPath, refreshExisting);
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
                    operationId, processedFiles, foundMetadata);

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
        string operationId, LibraryInfo library, string fullDirectoryPath, bool refreshExisting, 
        int baseProcessedFiles, int totalFiles, CancellationToken cancellationToken)
    {
        var mediaFiles = ScanDirectoryForMediaFiles(fullDirectoryPath);
        var processed = 0;
        var found = 0;

        foreach (var filePath in mediaFiles)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var fileName = Path.GetFileName(filePath);
            var progress = totalFiles > 0 ? (double)(baseProcessedFiles + processed) / totalFiles * 100.0 : 0.0;
            
            // Update progress
            if (_scanOperations.TryGetValue(operationId, out var operation))
            {
                var elapsedSeconds = (DateTime.UtcNow - operation.StartTime).TotalSeconds;
                var speed = elapsedSeconds > 0 ? (baseProcessedFiles + processed) / elapsedSeconds : 0;
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
                        await _hubContext.Clients.All.SendAsync("ScanOperationUpdated", updatedOperation, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to broadcast scan progress update");
                    }
                }
            }

            // Process the file
            var movieTitle = ExtractMovieTitleFromFileName(Path.GetFileName(filePath));
            if (string.IsNullOrWhiteSpace(movieTitle))
            {
                processed++;
                continue;
            }

            var relativePath = Path.GetRelativePath(_dataPath, filePath);
            var existingMetadata = await _movieMetadataCollection
                .Find(m => m.LibraryId == library.Id && m.FilePath == relativePath)
                .FirstOrDefaultAsync(cancellationToken);

            if (existingMetadata != null && !refreshExisting)
            {
                processed++;
                found++;
                continue;
            }

            try
            {
                var searchResults = await _tmdbClient.SearchMovieAsync(movieTitle, cancellationToken: cancellationToken);
                if (searchResults.Results.Count > 0)
                {
                    var movieResult = searchResults.Results[0];
                    var movieDetails = await _tmdbClient.GetMovieAsync(movieResult.Id, cancellationToken: cancellationToken);

                    var movieMetadata = new MovieMetadata
                    {
                        Id = existingMetadata?.Id ?? ObjectId.GenerateNewId().ToString(),
                        LibraryId = library.Id ?? string.Empty,
                        FilePath = relativePath,
                        TmdbId = movieDetails.Id,
                        Title = movieDetails.Title,
                        OriginalTitle = movieDetails.OriginalTitle,
                        OriginalLanguage = movieDetails.OriginalLanguage,
                        Overview = movieDetails.Overview ?? string.Empty,
                        ReleaseDate = movieDetails.ReleaseDate,
                        Genres = movieDetails.Genres?.Select(g => g.Name).ToArray() ?? [],
                        VoteAverage = movieDetails.VoteAverage,
                        VoteCount = movieDetails.VoteCount,
                        PosterPath = movieDetails.PosterPath,
                        BackdropPath = movieDetails.BackdropPath,
                        Cast = [],
                        Crew = [],
                        CreatedAt = existingMetadata?.CreatedAt ?? DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow,
                    };

                    if (existingMetadata != null)
                    {
                        await _movieMetadataCollection.ReplaceOneAsync(
                            m => m.Id == existingMetadata.Id,
                            movieMetadata,
                            cancellationToken: cancellationToken);
                    }
                    else
                    {
                        await _movieMetadataCollection.InsertOneAsync(movieMetadata, cancellationToken: cancellationToken);
                    }

                    found++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to fetch metadata for movie: {MovieTitle} (File: {FilePath})", 
                    movieTitle, filePath);
            }

            processed++;

            // Throttle to avoid overwhelming the API
            await Task.Delay(250, cancellationToken);
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
