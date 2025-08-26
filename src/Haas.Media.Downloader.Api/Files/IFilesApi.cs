using Haas.Media.Downloader.Api.Encodings;

namespace Haas.Media.Downloader.Api.Files;

public interface IFilesApi
{
    FileItem[] GetFiles(string? path = null);
    Task CopyFileAsync(string sourcePath, string destinationPath);
    void MoveFile(string sourcePath, string destinationPath);
    void RenameFile(string relativePath, string newFileName);
    void DeleteFile(string relativePath);
    void CreateDirectory(string relativePath);
    void DeleteDirectory(string relativePath);
}
