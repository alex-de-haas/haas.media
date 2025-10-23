using System.Diagnostics;
using Haas.Media.Core;
using Haas.Media.Core.FFMpeg;

namespace Haas.Media.Services.Files;

/// <summary>
/// Service for streaming video files with on-the-fly transcoding using FFmpeg
/// </summary>
public class VideoStreamingService
{
    private readonly ILogger<VideoStreamingService> _logger;

    public VideoStreamingService(ILogger<VideoStreamingService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Stream video with optional transcoding
    /// </summary>
    public async Task StreamVideoAsync(
        string filePath,
        HttpContext context,
        bool transcode = false,
        string? format = null,
        string? quality = null
    )
    {
        if (!File.Exists(filePath))
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsync("File not found");
            return;
        }

        // If no transcoding requested, handle as regular file stream
        if (!transcode)
        {
            await StreamDirectAsync(filePath, context);
            return;
        }

        // Transcode using FFmpeg
        await TranscodeAndStreamAsync(filePath, context, format, quality);
    }

    /// <summary>
    /// Stream file directly without transcoding (supports range requests)
    /// </summary>
    private async Task StreamDirectAsync(string filePath, HttpContext context)
    {
        var fileInfo = new FileInfo(filePath);
        var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);

        var contentType = GetContentType(fileInfo.Extension);
        var rangeHeader = context.Request.Headers.Range.ToString();

        if (!string.IsNullOrEmpty(rangeHeader))
        {
            var range = ParseRangeHeader(rangeHeader, fileInfo.Length);
            if (range.HasValue)
            {
                var (start, end) = range.Value;
                var length = end - start + 1;

                fileStream.Seek(start, SeekOrigin.Begin);
                var limitedStream = new LimitedStream(fileStream, length);

                context.Response.StatusCode = 206;
                context.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileInfo.Length}";
                context.Response.ContentType = contentType;
                context.Response.Headers.AcceptRanges = "bytes";
                context.Response.ContentLength = length;

                await limitedStream.CopyToAsync(context.Response.Body);
                await limitedStream.DisposeAsync();
                return;
            }
        }

        // Normal response without range
        context.Response.Headers.AcceptRanges = "bytes";
        context.Response.ContentType = contentType;
        context.Response.ContentLength = fileInfo.Length;

        await fileStream.CopyToAsync(context.Response.Body);
        await fileStream.DisposeAsync();
    }

    /// <summary>
    /// Transcode video on-the-fly and stream to client
    /// Note: Transcoded streams don't support range requests (seeking)
    /// </summary>
    private async Task TranscodeAndStreamAsync(
        string filePath,
        HttpContext context,
        string? format,
        string? quality
    )
    {
        // Parse output format (default to mp4)
        var outputFormat = format?.ToLowerInvariant() ?? "mp4";
        var contentType = outputFormat switch
        {
            "webm" => "video/webm",
            "mp4" => "video/mp4",
            "mkv" => "video/x-matroska",
            _ => "video/mp4"
        };

        // Parse quality preset
        var qualityPreset = quality?.ToLowerInvariant() ?? "medium";
        var (videoCodec, audioBitrate, crf) = GetQualitySettings(outputFormat, qualityPreset);

        try
        {
            // Build FFmpeg command for streaming
            var ffmpegPath = GlobalFFOptions.GetFFMpegBinaryPath();
            var arguments = BuildFFmpegStreamingArgs(
                filePath,
                outputFormat,
                videoCodec,
                crf,
                audioBitrate
            );

            _logger.LogInformation(
                "Starting FFmpeg transcode stream: {FilePath} -> {Format} (quality: {Quality})",
                filePath,
                outputFormat,
                qualityPreset
            );

            var processStartInfo = new ProcessStartInfo
            {
                FileName = ffmpegPath,
                Arguments = arguments,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };

            // Start the process
            process.Start();

            // Set response headers
            context.Response.ContentType = contentType;
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            // Note: We cannot set Content-Length for transcoded streams
            // and we cannot support range requests during transcoding

            // Stream FFmpeg output directly to response
            await process.StandardOutput.BaseStream.CopyToAsync(
                context.Response.Body,
                context.RequestAborted
            );

            // Log any errors from FFmpeg
            _ = Task.Run(async () =>
            {
                var errors = await process.StandardError.ReadToEndAsync();
                if (!string.IsNullOrEmpty(errors))
                {
                    _logger.LogWarning("FFmpeg stderr: {Errors}", errors);
                }
            });

            await process.WaitForExitAsync(context.RequestAborted);

            if (process.ExitCode != 0)
            {
                _logger.LogError("FFmpeg process exited with code {ExitCode}", process.ExitCode);
            }
            else
            {
                _logger.LogInformation("FFmpeg transcode completed successfully");
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Transcode stream cancelled by client");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during video transcoding");
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = 500;
                await context.Response.WriteAsync("Transcoding error");
            }
        }
    }

    /// <summary>
    /// Build FFmpeg arguments for streaming transcoding
    /// </summary>
    private string BuildFFmpegStreamingArgs(
        string inputPath,
        string format,
        string videoCodec,
        int crf,
        string audioBitrate
    )
    {
        // Select appropriate audio codec based on output format
        var audioCodec = format switch
        {
            "webm" => "libopus", // Opus for WebM
            "mp4" => "aac", // AAC for MP4
            "mkv" => "aac", // AAC for MKV
            _ => "aac"
        };

        var args = new List<string>
        {
            // Input
            $"-i \"{inputPath}\"",
            // Video codec
            $"-c:v {videoCodec}",
            // Quality setting (CRF for quality-based encoding)
            $"-crf {crf}",
            // Preset for encoding speed vs compression
            "-preset fast",
            // Audio codec and bitrate
            $"-c:a {audioCodec}",
            $"-b:a {audioBitrate}",
        };

        // Add format-specific optimization flags
        if (format == "mp4")
        {
            args.Add("-movflags +faststart+frag_keyframe+empty_moov");
        }

        // Output format
        args.Add($"-f {format}");

        // Output to stdout (pipe:1)
        args.Add("pipe:1");

        return string.Join(" ", args);
    }

    /// <summary>
    /// Get video codec, audio bitrate, and CRF based on format and quality
    /// </summary>
    private (string videoCodec, string audioBitrate, int crf) GetQualitySettings(
        string format,
        string quality
    )
    {
        // Select video codec based on format
        var videoCodec = format switch
        {
            "webm" => "libvpx-vp9", // VP9 for WebM
            "mp4" => "libx264", // H.264 for MP4
            "mkv" => "libx264", // H.264 for MKV
            _ => "libx264"
        };

        // Quality presets: lower CRF = higher quality
        // CRF scale: 0 (lossless) to 51 (worst) - typical range 18-28
        var (crf, audioBitrate) = quality switch
        {
            "low" => (28, "96k"), // Low quality, smaller file
            "medium" => (23, "128k"), // Balanced
            "high" => (20, "192k"), // High quality
            "ultra" => (18, "256k"), // Very high quality
            _ => (23, "128k") // Default to medium
        };

        return (videoCodec, audioBitrate, crf);
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".mp4" => "video/mp4",
            ".mkv" => "video/x-matroska",
            ".webm" => "video/webm",
            ".avi" => "video/x-msvideo",
            ".mov" => "video/quicktime",
            ".wmv" => "video/x-ms-wmv",
            ".flv" => "video/x-flv",
            ".m4v" => "video/x-m4v",
            ".mpg" or ".mpeg" => "video/mpeg",
            ".ogv" => "video/ogg",
            ".3gp" => "video/3gpp",
            _ => "application/octet-stream"
        };
    }

    private static (long start, long end)? ParseRangeHeader(string rangeHeader, long fileSize)
    {
        if (!rangeHeader.StartsWith("bytes="))
            return null;

        var range = rangeHeader["bytes=".Length..].Split('-');
        if (range.Length != 2)
            return null;

        long start = 0;
        long end = fileSize - 1;

        if (!string.IsNullOrEmpty(range[0]))
        {
            if (!long.TryParse(range[0], out start))
                return null;
        }

        if (!string.IsNullOrEmpty(range[1]))
        {
            if (!long.TryParse(range[1], out end))
                return null;
        }

        if (start > end || start >= fileSize)
            return null;

        end = Math.Min(end, fileSize - 1);

        return (start, end);
    }
}
