namespace Haas.Media.Downloader.Api.Encodings;

public interface IEncodingApi
{
    Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string relativePath);
    Task StartEncodingAsync(EncodeRequest request, CancellationToken ct = default);
    EncodingInfo[] GetEncodingsAsync();
    Task StopEncodingAsync(string id);
}
