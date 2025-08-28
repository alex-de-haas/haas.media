using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Haas.Media.Core.FFMpeg;
using Instances;

namespace Haas.Media.Core;

public static partial class MediaHelper
{
    public static async Task<FFProbeAnalysis> GetFFProbeAnalysisAsync(string filePath)
    {
        var instance = PrepareStreamAnalysisInstance(filePath, GlobalFFOptions.Current, null);
        var result = await instance.StartAndWaitForExitAsync().ConfigureAwait(false);

        var json = string.Join(string.Empty, result.OutputData);
        var ffProbeAnalysis = JsonSerializer.Deserialize<FFProbeAnalysis>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling =
                    System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString
                    | System.Text.Json.Serialization.JsonNumberHandling.WriteAsString,
            }
        );

        return ffProbeAnalysis!;
    }

    [GeneratedRegex(@"^(\d+):(\d{1,2}):(\d{1,2})\.(\d{1,3})", RegexOptions.Compiled)]
    private static partial Regex DurationRegex { get; }

    [GeneratedRegex(@"time=(\d+:\d+:\d+\.\d+)", RegexOptions.Compiled)]
    private static partial Regex ProgressTimeRegex { get; }

    [GeneratedRegex(@"frame=\s*(\d+)", RegexOptions.Compiled)]
    private static partial Regex ProgressFramesRegex { get; }

    public static TimeSpan ParseDuration(FFProbeStream stream)
    {
        if (!string.IsNullOrEmpty(stream.Duration))
        {
            return ParseDuration(stream.Duration);
        }
        else
        {
            var durationTag = stream.Tags?.FirstOrDefault(t => t.Key.StartsWith("DURATION")).Value;
            if (durationTag is not null)
            {
                return ParseDuration(durationTag);
            }
        }

        return TimeSpan.Zero;
    }

    public static long ParseBitRate(FFProbeStream stream)
    {
        if (long.TryParse(stream.BitRate, out var bitRate))
        {
            return bitRate;
        }
        if (stream.Tags is not null)
        {
            var bitRateTag = stream.Tags?.FirstOrDefault(t => t.Key.StartsWith("BPS")).Value;
            if (bitRateTag is not null && long.TryParse(bitRateTag, out bitRate))
            {
                return bitRate;
            }
        }

        return 0;
    }

    private static TimeSpan ParseDuration(string duration)
    {
        var match = DurationRegex.Match(duration);
        if (match.Success)
        {
            var millisecondsPart = match.Groups[4].Value;
            if (millisecondsPart.Length < 3)
            {
                millisecondsPart = millisecondsPart.PadRight(3, '0');
            }

            var hours = int.Parse(match.Groups[1].Value);
            var minutes = int.Parse(match.Groups[2].Value);
            var seconds = int.Parse(match.Groups[3].Value);
            var milliseconds = int.Parse(millisecondsPart);
            return new TimeSpan(0, hours, minutes, seconds, milliseconds);
        }

        return TimeSpan.Zero;
    }

    public static double? ParseProgress(string time, MediaInfo.Stream videoStream)
    {
        if (!string.IsNullOrEmpty(time))
        {
            // Try to match time format first (HH:MM:SS.ms)
            var matchTime = ProgressTimeRegex.Match(time);
            if (matchTime.Success)
            {
                var duration = ParseDuration(matchTime.Groups[1].Value);
                var progress = duration.TotalSeconds / videoStream.Duration.TotalSeconds * 100;
                return progress;
            }

            // If time format doesn't match, try frame format
            var matchFrames = ProgressFramesRegex.Match(time);
            if (matchFrames.Success)
            {
                var currentFrame = int.Parse(matchFrames.Groups[1].Value);
                
                // Calculate total frames using frame rate and duration
                var frameRate = videoStream.FrameRate ?? videoStream.AvgFrameRate;
                if (frameRate.HasValue && frameRate.Value > 0)
                {
                    var totalFrames = (long)(frameRate.Value * videoStream.Duration.TotalSeconds);
                    if (totalFrames > 0)
                    {
                        var progress = (double)currentFrame / totalFrames * 100;
                        return Math.Min(progress, 100); // Cap at 100%
                    }
                }
            }
        }

        return null;
    }

    public static Task<IProcessResult> StartFFMpegEncodeAsync(string command)
    {
        var instance = PrepareFFMpegInstance(command, GlobalFFOptions.Current, null);
        return instance.StartAndWaitForExitAsync();
    }

    public static IProcessInstance StartFFMpegEncode(string command)
    {
        var instance = PrepareFFMpegInstance(command, GlobalFFOptions.Current, null);
        return instance.Start();
    }

    private static ProcessArguments PrepareStreamAnalysisInstance(
        string filePath,
        FFOptions ffOptions,
        string? customArguments
    )
    {
        return PrepareFFProbeInstance(
            $"-loglevel error -print_format json -show_format -sexagesimal -show_streams -show_chapters \"{filePath}\"",
            ffOptions,
            customArguments
        );
    }

    private static ProcessArguments PrepareFFProbeInstance(
        string arguments,
        FFOptions ffOptions,
        string? customArguments
    )
    {
        var startInfo = new ProcessStartInfo(
            GlobalFFOptions.GetFFProbeBinaryPath(ffOptions),
            $"{arguments} {customArguments}"
        )
        {
            StandardOutputEncoding = ffOptions.Encoding,
            StandardErrorEncoding = ffOptions.Encoding,
            WorkingDirectory = ffOptions.WorkingDirectory,
        };
        return new ProcessArguments(startInfo);
    }

    private static ProcessArguments PrepareFFMpegInstance(
        string arguments,
        FFOptions ffOptions,
        string? customArguments
    )
    {
        var startInfo = new ProcessStartInfo(
            GlobalFFOptions.GetFFMpegBinaryPath(ffOptions),
            $"{arguments} {customArguments}"
        )
        {
            RedirectStandardError = true,
            StandardOutputEncoding = ffOptions.Encoding,
            StandardErrorEncoding = ffOptions.Encoding,
            WorkingDirectory = ffOptions.WorkingDirectory,
        };
        return new ProcessArguments(startInfo);
    }
}
