namespace Haas.Media.Downloader.Api.Metadata;

public interface IMetadataApi
{
    Task<IEnumerable<LibraryInfo>> GetLibrariesAsync();
    Task<LibraryInfo?> GetLibraryAsync(string id);
    Task<LibraryInfo> AddLibraryAsync(LibraryInfo library);
    Task<LibraryInfo?> UpdateLibraryAsync(string id, LibraryInfo library);
    Task<bool> DeleteLibraryAsync(string id);
    Task<string> StartScanLibrariesAsync(bool refreshExisting = true);
    Task<string> StartRefreshMetadataAsync();
    Task<IEnumerable<MovieMetadata>> GetMovieMetadataAsync(string? libraryId = null);
    Task<MovieMetadata?> GetMovieMetadataByIdAsync(int id);
    Task<bool> DeleteMovieMetadataAsync(int id);
    Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null);
    Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(int id);
    Task<bool> DeleteTVShowMetadataAsync(int id);
    Task<IEnumerable<SearchResult>> SearchAsync(string query, LibraryType? libraryType = null);
    Task<AddToLibraryResponse> AddToLibraryAsync(AddToLibraryRequest request);
}
