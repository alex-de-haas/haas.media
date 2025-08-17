namespace Haas.Media.Downloader.Api.Convert;

public interface IConvertApi
{
    Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash);
}
