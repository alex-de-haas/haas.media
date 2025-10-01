using Haas.Media.Downloader.Api.Encodings;
using Microsoft.AspNetCore.Http;

namespace Haas.Media.Downloader.Api.Files;

public interface IFilesApi
{
    FileItem[] GetFiles(string? path = null);
    Task<string> StartCopyAsync(string sourcePath, string destinationPath);
    CopyOperationInfo[] GetCopyOperations();
    Task<bool> CancelCopyOperationAsync(string operationId);
    void Move(string sourcePath, string destinationPath);
    void RenameFile(string relativePath, string newName);
    void Delete(string relativePath);
    void CreateDirectory(string relativePath);
    Task<FileUploadResult> UploadAsync(string? directoryPath, IFormFileCollection files, bool overwriteExisting = false);
}
