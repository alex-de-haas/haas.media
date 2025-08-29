using System.Diagnostics;
using System.Text.Json;
using System.Text.RegularExpressions;
using Haas.Media.Core.FFMpeg;
using Instances;

namespace Haas.Media.Core;

public static partial class MediaHelper
{
    public static async Task<HardwareAccelerationInfo[]> GetHardwareAccelerationInfoAsync()
    {
        var supportedAccelerations = await GetSupportedHardwareAccelerationsAsync();
        var result = new List<HardwareAccelerationInfo>();

        foreach (var acceleration in supportedAccelerations)
        {
            var info = new HardwareAccelerationInfo
            {
                HardwareAcceleration = acceleration,
                Devices = await GetDevicesForAccelerationAsync(acceleration),
                Encoders = await GetCodecsForAccelerationAsync(acceleration, isEncoder: true),
                Decoders = await GetCodecsForAccelerationAsync(acceleration, isEncoder: false),
            };
            result.Add(info);
        }

        return result.ToArray();
    }

    private static async Task<HardwareAcceleration[]> GetSupportedHardwareAccelerationsAsync()
    {
        var instance = PrepareFFMpegInstance("-hwaccels", GlobalFFOptions.Current, null);
        var result = await instance.StartAndWaitForExitAsync().ConfigureAwait(false);

        if (result.ExitCode == 0)
        {
            var hardwareAccelerations = new List<HardwareAcceleration>();
            foreach (var output in result.OutputData)
            {
                var hardwareAcceleration = output switch
                {
                    // "vdpau" => HardwareAcceleration.VDPAU,
                    "cuda" => HardwareAcceleration.NVENC,
                    "vaapi" => HardwareAcceleration.VAAPI,
                    // "dxva2" => HardwareAcceleration.DXVA2,
                    "qsv" => HardwareAcceleration.QSV,
                    "videotoolbox" => HardwareAcceleration.VideoToolbox,
                    "d3d11va" => HardwareAcceleration.AMF,
                    // "opencl" => HardwareAcceleration.OpenCL,
                    // "drm" => HardwareAcceleration.DRM,
                    _ => HardwareAcceleration.None,
                };
                if (hardwareAcceleration != HardwareAcceleration.None)
                {
                    hardwareAccelerations.Add(hardwareAcceleration);
                }
            }

            return hardwareAccelerations.ToArray();
        }

        return Array.Empty<HardwareAcceleration>();
    }

    private static async Task<string[]> GetDevicesForAccelerationAsync(
        HardwareAcceleration acceleration
    )
    {
        var deviceArgument = acceleration switch
        {
            HardwareAcceleration.NVENC =>
                "-f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -c:v h264_nvenc -list_devices 1 -f null -",
            HardwareAcceleration.QSV =>
                "-init_hw_device qsv -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -c:v h264_qsv -list_devices 1 -f null -",
            HardwareAcceleration.AMF =>
                "-f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -c:v h264_amf -list_devices 1 -f null -",
            HardwareAcceleration.VideoToolbox =>
                "-f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -c:v h264_videotoolbox -f null -",
            HardwareAcceleration.VAAPI =>
                GetVAAPIDeviceTestCommand(),
            _ => null,
        };

        if (string.IsNullOrEmpty(deviceArgument))
        {
            return Array.Empty<string>();
        }

        try
        {
            var instance = PrepareFFMpegInstance(deviceArgument, GlobalFFOptions.Current, null);
            var result = await instance.StartAndWaitForExitAsync().ConfigureAwait(false);

            var devices = new List<string>();

            // For VAAPI, check for available DRM devices directly
            if (acceleration == HardwareAcceleration.VAAPI)
            {
                var possibleDevices = new[] { 
                    "/dev/dri/renderD128", 
                    "/dev/dri/renderD129", 
                    "/dev/dri/renderD130",  // For newer AMD GPUs like 890M
                    "/dev/dri/card0", 
                    "/dev/dri/card1",
                    "/dev/dri/card2"
                };
                
                foreach (var device in possibleDevices)
                {
                    if (File.Exists(device))
                    {
                        devices.Add(device);
                    }
                }
                
                // If no devices were found, add the default one
                if (devices.Count == 0)
                {
                    devices.Add("/dev/dri/renderD128");
                }
                
                return devices.ToArray();
            }

            // For other hardware acceleration types, parse FFmpeg output
            var captureDevices = false;
            foreach (var line in result.ErrorData.Concat(result.OutputData))
            {
                if (line.Contains("Available devices:") || line.Contains("Device list:"))
                {
                    captureDevices = true;
                    continue;
                }

                if (captureDevices && !string.IsNullOrWhiteSpace(line))
                {
                    if (line.Trim().StartsWith("[") && line.Contains("]"))
                    {
                        var deviceName = line.Trim();
                        devices.Add(deviceName);
                    }
                }
            }

            return devices.ToArray();
        }
        catch
        {
            return Array.Empty<string>();
        }
    }

    private static async Task<StreamCodec[]> GetCodecsForAccelerationAsync(
        HardwareAcceleration acceleration,
        bool isEncoder
    )
    {
        var command = isEncoder ? "-encoders" : "-decoders";
        var instance = PrepareFFMpegInstance(command, GlobalFFOptions.Current, null);
        var result = await instance.StartAndWaitForExitAsync().ConfigureAwait(false);

        if (result.ExitCode != 0)
        {
            return Array.Empty<StreamCodec>();
        }

        var codecs = new List<StreamCodec>();
        var accelerationPrefix = GetAccelerationPrefix(acceleration);

        foreach (var line in result.OutputData)
        {
            if (string.IsNullOrWhiteSpace(line) || !line.Contains(accelerationPrefix))
            {
                continue;
            }

            var codec = ParseCodecFromLine(line, isEncoder);
            if (codec != StreamCodec.Unknown && !codecs.Contains(codec))
            {
                codecs.Add(codec);
            }
        }

        return codecs.ToArray();
    }

    private static string GetAccelerationPrefix(HardwareAcceleration acceleration)
    {
        return acceleration switch
        {
            HardwareAcceleration.NVENC => "nvenc",
            HardwareAcceleration.QSV => "qsv",
            HardwareAcceleration.AMF => "amf",
            HardwareAcceleration.VideoToolbox => "videotoolbox",
            HardwareAcceleration.VAAPI => "vaapi",
            _ => "",
        };
    }

    private static string GetVAAPIDeviceTestCommand()
    {
        // Try to find available VAAPI devices dynamically
        // For newer AMD APUs like Ryzen AI 9 HX 370 with 890M
        var possibleDevices = new[] { 
            "/dev/dri/renderD128", 
            "/dev/dri/renderD129", 
            "/dev/dri/renderD130",
            "/dev/dri/card0", 
            "/dev/dri/card1",
            "/dev/dri/card2"
        };
        
        foreach (var device in possibleDevices)
        {
            // In containers, device might not be accessible during build but available at runtime
            if (Environment.GetEnvironmentVariable("DOTNET_RUNNING_IN_CONTAINER") == "true" || File.Exists(device))
            {
                return $"-vaapi_device {device} -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -vf 'format=nv12,hwupload' -c:v h264_vaapi -f null -";
            }
        }
        
        // Fallback to default if no devices found
        return "-vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -vf 'format=nv12,hwupload' -c:v h264_vaapi -f null -";
    }

    private static StreamCodec ParseCodecFromLine(string line, bool isEncoder)
    {
        // FFmpeg output format: " V..... h264_nvenc            NVIDIA NVENC H.264 encoder"
        var parts = line.Split(new[] { ' ' }, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length < 2)
        {
            return StreamCodec.Unknown;
        }

        var codecName = parts[1].ToLowerInvariant();

        return codecName switch
        {
            var name when name.Contains("h264") => StreamCodec.H264,
            var name when name.Contains("h265") || name.Contains("hevc") => StreamCodec.HEVC,
            var name when name.Contains("mpeg2") => StreamCodec.Mpeg2Video,
            var name when name.Contains("mpeg4") => StreamCodec.Mpeg4Part2,
            var name when name.Contains("vp8") => StreamCodec.VP8,
            var name when name.Contains("vp9") => StreamCodec.VP9,
            var name when name.Contains("av1") => StreamCodec.AV1,
            var name when name.Contains("vc1") => StreamCodec.VC1,
            var name when name.Contains("prores") => StreamCodec.ProRes,
            var name when name.Contains("theora") => StreamCodec.Theora,
            var name when name.Contains("aac") => StreamCodec.AdvancedAudioCoding,
            var name when name.Contains("ac3") => StreamCodec.DolbyDigital,
            var name when name.Contains("eac3") => StreamCodec.DolbyDigitalPlus,
            var name when name.Contains("truehd") => StreamCodec.DolbyTrueHD,
            var name when name.Contains("mp3") => StreamCodec.MpegLayer3,
            var name when name.Contains("flac") => StreamCodec.Flac,
            var name when name.Contains("opus") => StreamCodec.Opus,
            var name when name.Contains("vorbis") => StreamCodec.Vorbis,
            var name when name.Contains("dts") => StreamCodec.DTS,
            var name when name.Contains("alac") => StreamCodec.ALAC,
            var name when name.Contains("pcm") => StreamCodec.PCM,
            _ => StreamCodec.Unknown,
        };
    }

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
