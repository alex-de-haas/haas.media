namespace Haas.Media.Core.Helpers;

public static class FileHelper
{
    public static bool IsMediaFile(string path)
    {
        var ext = Path.GetExtension(path);
        return !string.IsNullOrEmpty(ext) && CommonConstants.MediaExtensions.Contains(ext);
    }
}
