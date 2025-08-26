using Haas.Media.Downloader.Api.Encodings;

namespace Haas.Media.Downloader.Api.Files;

public interface IFilesApi
{
    Task<FileItem[]> GetFilesAsync(string? path = null);
    Task<FileItem> GetFileInfoAsync(string relativePath);
    Task CopyFileAsync(string sourcePath, string destinationPath);
    Task MoveFileAsync(string sourcePath, string destinationPath);
    Task DeleteFileAsync(string relativePath);
    Task DeleteDirectoryAsync(string relativePath);
    Task CreateDirectoryAsync(string relativePath);
}
