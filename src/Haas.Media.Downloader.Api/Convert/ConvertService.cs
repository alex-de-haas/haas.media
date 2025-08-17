using Haas.Media.Core;

namespace Haas.Media.Downloader.Api.Convert;

public class ConvertService : IConvertApi
{
    private readonly string _downloadsPath;
    private static readonly HashSet<string> _allowedExtensions = InternalConstants.MediaExtensions;

    public ConvertService()
    {
        _downloadsPath = Path.Combine(Environment.CurrentDirectory, "data", "downloads");
        Directory.CreateDirectory(_downloadsPath);
    }

    public async Task<IEnumerable<MediaFileInfo>> GetMediaFilesInfoAsync(string hash)
    {
        var path = Path.Combine(_downloadsPath, hash);
        if (!Directory.Exists(path))
            return [];

        var files = Directory
            .EnumerateFiles(path, "*.*", SearchOption.AllDirectories)
            .Where(f => _allowedExtensions.Contains(Path.GetExtension(f)))
            .Select(f =>
            {
                var fi = new FileInfo(f);
                var relative = Path.GetRelativePath(_downloadsPath, f);
                return new MediaFileInfo
                {
                    Name = fi.Name,
                    RelativePath = relative,
                    Size = fi.Length,
                    LastModified = fi.LastWriteTimeUtc,
                    Extension = fi.Extension,
                };
            })
            .OrderByDescending(m => m.LastModified)
            .ToArray();

        foreach (var file in files)
        {
            file.MediaInfo = await MediaManager.GetMediaInfoAsync(
                Path.Combine(_downloadsPath, file.RelativePath)
            );
        }

        return files;
    }
}
