using Haas.Media.Downloader.Api.Files;

namespace Haas.Media.Downloader.Api.Encodings;

public interface IEncodingApi
{
    Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash);
    Task StartEncodingAsync(string hash, EncodeRequest request, CancellationToken ct = default);
    EncodingInfo[] GetEncodingsAsync();
    Task StopEncodingAsync(string hash);
}
