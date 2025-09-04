namespace Haas.Media.Downloader.Api.Metadata;

public interface IMetadataApi
{
    Task<IEnumerable<LibraryInfo>> GetLibrariesAsync();
    Task<LibraryInfo?> GetLibraryAsync(string id);
    Task<LibraryInfo> AddLibraryAsync(LibraryInfo library);
    Task<LibraryInfo?> UpdateLibraryAsync(string id, LibraryInfo library);
    Task<bool> DeleteLibraryAsync(string id);
    Task ScanLibrariesAsync(bool refreshExisting = true);
    Task<IEnumerable<MovieMetadata>> GetMovieMetadataAsync(string? libraryId = null);
    Task<MovieMetadata?> GetMovieMetadataByIdAsync(string id);
    Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null);
    Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(string id);
}
