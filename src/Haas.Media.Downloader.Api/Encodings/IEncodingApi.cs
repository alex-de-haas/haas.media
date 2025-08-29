namespace Haas.Media.Downloader.Api.Encodings;

public interface IEncodingApi
{
    Task<EncodingInfo> GetEncodingInfoAsync(string relativePath);
    Task StartEncodingAsync(EncodeRequest request, CancellationToken ct = default);
    EncodingProcessInfo[] GetEncodingsAsync();
    Task StopEncodingAsync(string id);
}
