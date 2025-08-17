namespace Haas.Media.Downloader.Api;

// Central location for internal constants shared across the Downloader API assembly.
internal static class InternalConstants
{
    // Comprehensive list of media file extensions we recognize for torrent file classification.
    internal static HashSet<string> MediaExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        // Видео-контейнеры
        ".mp4",
        ".mkv",
        ".avi",
        ".mov",
        ".flv",
        ".wmv",
        ".webm",
        ".mpg",
        ".mpeg",
        ".3gp",
        ".ogv",
        ".ts",
        ".m2ts",
        ".vob",
        // Аудио-контейнеры
        ".mp3",
        ".aac",
        ".wav",
        ".flac",
        ".ogg",
        ".opus",
        ".m4a",
        ".wma",
        ".alac",
        ".aiff",
        ".amr",
        // Изображения
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".tiff",
        ".gif",
        ".webp",
        // Потоковые форматы
        ".m3u8",
        ".dash",
        ".ismv",
        ".f4v",
        // Субтитры
        ".srt", // SubRip
        ".ass", // Advanced SubStation Alpha
        ".ssa", // SubStation Alpha
        ".vtt", // WebVTT
        ".sub", // MicroDVD / VobSub (часто вместе с .idx)
        ".idx", // VobSub индекс
        ".sup", // Blu-ray PGS
        ".stl", // EBU STL
        ".scc", // Scenarist Closed Captions
    };
}
