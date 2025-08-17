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

    public static TimeSpan ParseDuration(string duration)
    {
        if (!string.IsNullOrEmpty(duration))
        {
            var match = DurationRegex.Match(duration);
            if (match.Success)
            {
                // ffmpeg may provide < 3-digit number of milliseconds (omitting trailing zeros), which won't simply parse correctly
                // e.g. 00:12:02.11 -> 12 minutes 2 seconds and 110 milliseconds
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
        }
        
        return TimeSpan.Zero;
    }

    public static TimeSpan? ParseProgressTime(string time)
    {
        if (!string.IsNullOrEmpty(time))
        {
            var match = ProgressTimeRegex.Match(time);
            if (match.Success)
            {
                return ParseDuration(match.Groups[1].Value);
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
