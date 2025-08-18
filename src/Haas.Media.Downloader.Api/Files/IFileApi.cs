namespace Haas.Media.Downloader.Api.Files;

public interface IFileApi
{
    Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash);
    Task<string> EncodeAsync(string hash, EncodeRequest request, CancellationToken ct = default);
}
