namespace Haas.Media.Downloader.Api.Files;

public interface IFileApi
{
    Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash);
    Task EncodeAsync(string hash, EncodeRequest request, CancellationToken ct = default);
    EncodingInfo[] GetEncodingsAsync();
}
