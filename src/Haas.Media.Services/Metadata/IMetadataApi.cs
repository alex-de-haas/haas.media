namespace Haas.Media.Services.Metadata;

public interface IMetadataApi
{
    Task<IEnumerable<LibraryInfo>> GetLibrariesAsync();
    Task<LibraryInfo?> GetLibraryAsync(string id);
    Task<LibraryInfo> AddLibraryAsync(LibraryInfo library);
    Task<LibraryInfo?> UpdateLibraryAsync(string id, LibraryInfo library);
    Task<bool> DeleteLibraryAsync(string id);
    Task<string> StartScanLibrariesAsync();
    Task<string> StartRefreshMetadataAsync();
    Task<IEnumerable<MovieMetadata>> GetMovieMetadataAsync(string? libraryId = null);
    Task<MovieMetadata?> GetMovieMetadataByIdAsync(int id);
    Task<bool> DeleteMovieMetadataAsync(int id);
    Task<IEnumerable<TVShowMetadata>> GetTVShowMetadataAsync(string? libraryId = null);
    Task<TVShowMetadata?> GetTVShowMetadataByIdAsync(int id);
    Task<bool> DeleteTVShowMetadataAsync(int id);
    Task<IEnumerable<SearchResult>> SearchAsync(string query, LibraryType? libraryType = null);
    Task<AddToLibraryResponse> AddToLibraryAsync(AddToLibraryRequest request);
    
    // File Metadata operations
    Task<IEnumerable<FileMetadata>> GetFileMetadataAsync(string? libraryId = null, int? mediaId = null);
    Task<FileMetadata?> GetFileMetadataByIdAsync(string id);
    Task<FileMetadata> AddFileMetadataAsync(FileMetadata fileMetadata);
    Task<bool> DeleteFileMetadataAsync(string id);
    Task<IEnumerable<FileMetadata>> GetFilesByMediaIdAsync(int mediaId, LibraryType mediaType);
    Task<PaginatedResult<PersonMetadata>> GetPeopleMetadataAsync(
        int skip = 0,
        int take = 100,
        string? query = null
    );
    Task<PersonMetadata?> GetPersonMetadataByIdAsync(int id);
    Task<PersonLibraryCredits?> GetPersonCreditsByIdAsync(int id);
}
