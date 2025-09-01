using MongoDB.Driver;
using MongoDB.Bson;

namespace Haas.Media.Downloader.Api.Metadata;

public class MetadataService : IMetadataApi
{
    private readonly IMongoCollection<LibraryInfo> _librariesCollection;
    private readonly ILogger<MetadataService> _logger;

    public MetadataService(IMongoDatabase database, ILogger<MetadataService> logger)
    {
        _librariesCollection = database.GetCollection<LibraryInfo>("libraries");
        _logger = logger;
        
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
            _logger.LogInformation("Added new library: {Title} at {DirectoryPath}", library.Title, library.DirectoryPath);
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

    private void CreateIndexes()
    {
        try
        {
            // Create index on DirectoryPath for faster lookups
            var directoryPathIndex = new CreateIndexModel<LibraryInfo>(
                Builders<LibraryInfo>.IndexKeys.Ascending(x => x.DirectoryPath),
                new CreateIndexOptions { Unique = true }
            );

            // Create index on Title for searching
            var titleIndex = new CreateIndexModel<LibraryInfo>(
                Builders<LibraryInfo>.IndexKeys.Ascending(x => x.Title)
            );

            _librariesCollection.Indexes.CreateMany([directoryPathIndex, titleIndex]);
            _logger.LogDebug("Created indexes for libraries collection");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error creating indexes for libraries collection");
        }
    }
}
