using System.Globalization;
using System.Text;
using Instances;

namespace Haas.Media.Core;

public enum HardwareAcceleration
{
    None = 0,
    NVENC = 1, // cuda - NVIDIA
    QSV = 2, // qsv - Intel
    AMF = 3, // d3d11va, amf - AMD (Windows)
    VideoToolbox = 4, // videotoolbox - Apple VideoToolbox (macOS)
    VAAPI = 5, // vaapi - AMD, Intel, NVIDIA (Linux)
    Auto = 99, // Auto-detect available hardware
}

public class MediaEncodingBuilder
{
    protected List<string> Outputs { get; } = [];
    protected List<string> Inputs { get; } = [];

    protected List<MediaInfo.Stream> Streams { get; } = [];

    protected StreamCodec VideoCodec { get; set; }
    protected HardwareAcceleration HardwareAccel { get; set; } = HardwareAcceleration.None;
    protected string? HardwareDevice { get; set; }
    protected MediaInfo.Stream? PrimaryVideoStream { get; set; }
    protected long? VideoBitrate { get; set; }
    protected bool VideoBitrateExplicitlySet { get; set; }
    protected double? VideoCrf { get; set; }
    protected bool VideoCrfExplicitlySet { get; set; }
    protected EncodingResolution? VideoResolution { get; set; }

    public static MediaEncodingBuilder Create()
    {
        return new MediaEncodingBuilder();
    }

    public MediaEncodingBuilder FromFileInput(string inputFilePath)
    {
        Inputs.Add(inputFilePath);
        return this;
    }

    public MediaEncodingBuilder ToFileOutput(string outputFilePath)
    {
        Outputs.Add(outputFilePath);
        return this;
    }

    public MediaEncodingBuilder WithVideoCodec(StreamCodec codec)
    {
        VideoCodec = codec;
        return this;
    }

    public MediaEncodingBuilder WithHardwareAcceleration(
        HardwareAcceleration acceleration,
        string? device = null
    )
    {
        HardwareAccel = acceleration;
        
        // Validate VAAPI device if specified
        if (acceleration == HardwareAcceleration.VAAPI)
        {
            var vaapiDevice = device ?? GetDefaultVAAPIDevice();
            if (!string.IsNullOrEmpty(vaapiDevice) && File.Exists(vaapiDevice))
            {
                HardwareDevice = vaapiDevice;
            }
            else
            {
                throw new InvalidOperationException($"VAAPI device '{vaapiDevice}' not found or not accessible");
            }
        }
        else
        {
            HardwareDevice = device;
        }
        
        return this;
    }

    public MediaEncodingBuilder WithVAAPI(string? device = null)
    {
        return WithHardwareAcceleration(HardwareAcceleration.VAAPI, device);
    }

    public MediaEncodingBuilder WithAutoHardwareAcceleration()
    {
        return WithHardwareAcceleration(HardwareAcceleration.Auto);
    }

    private static string? GetDefaultVAAPIDevice()
    {
        var possibleDevices = new[] { "/dev/dri/renderD128", "/dev/dri/renderD129", "/dev/dri/card0", "/dev/dri/card1" };
        return possibleDevices.FirstOrDefault(File.Exists);
    }

    public MediaEncodingBuilder WithVideoBitrate(long bitrate)
    {
        if (bitrate <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(bitrate), "Bitrate must be greater than zero");
        }

        VideoBitrate = bitrate;
        VideoBitrateExplicitlySet = true;
        VideoCrf = null;
        VideoCrfExplicitlySet = false;
        return this;
    }

    public MediaEncodingBuilder WithVideoConstantRateFactor(double crf)
    {
        if (double.IsNaN(crf) || double.IsInfinity(crf))
        {
            throw new ArgumentOutOfRangeException(nameof(crf), "CRF must be a finite number");
        }

        if (crf < 0 || crf > 51)
        {
            throw new ArgumentOutOfRangeException(nameof(crf), "CRF must be between 0 (lossless) and 51 (lowest quality)");
        }

        VideoCrf = crf;
        VideoCrfExplicitlySet = true;
        VideoBitrate = null;
        VideoBitrateExplicitlySet = false;
        return this;
    }

    public MediaEncodingBuilder WithVideoResolution(EncodingResolution resolution)
    {
        VideoResolution = resolution == EncodingResolution.Source ? null : resolution;
        return this;
    }

    public MediaEncodingBuilder WithStream(MediaInfo.Stream stream)
    {
        Streams.Add(stream);

        if (stream.Type == StreamType.Video)
        {
            PrimaryVideoStream ??= stream;

            if (!VideoBitrateExplicitlySet && !VideoCrfExplicitlySet)
            {
                var suggestedBitrate = GetSuggestedVideoBitrate(stream);
                if (suggestedBitrate.HasValue)
                {
                    VideoBitrate = suggestedBitrate.Value;
                }
            }
        }

        return this;
    }

    public Task<IProcessResult> EncodeAsync()
    {
        var ffmpegArguments = BuildFFMpegArguments();
        return MediaHelper.StartFFMpegEncodeAsync(ffmpegArguments);
    }

    public IProcessInstance Encode()
    {
        var ffmpegArguments = BuildFFMpegArguments();
        return MediaHelper.StartFFMpegEncode(ffmpegArguments);
    }

    private string BuildFFMpegArguments()
    {
        var command = new StringBuilder();

        // Add hardware acceleration parameters before inputs
        AddHardwareAccelerationArgs(command);

        foreach (var input in Inputs)
        {
            command.Append($" -i \"{input}\"");
        }

        if (Streams.Count == 0)
        {
            command.Append(" -map 0:v");
            command.Append(" -map 0:a");
        }
        else
        {
            foreach (var stream in Streams)
            {
                command.Append($" -map 0:{stream.Index}");
            }
        }

        var videoCodec = GetFFMpegCodec(VideoCodec, HardwareAccel);
        command.Append($" -c:v {videoCodec}");

        AppendVideoResolutionArgs(command, videoCodec);
        AppendVideoQualityArgs(command, videoCodec);

        command.Append(" -c:a copy");

        command.Append($" \"{Outputs.First()}\"");

        return command.ToString();
    }

    private void AddHardwareAccelerationArgs(StringBuilder command)
    {
        switch (HardwareAccel)
        {
            case HardwareAcceleration.NVENC:
                command.Append(" -hwaccel cuda");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;

            case HardwareAcceleration.QSV:
                command.Append(" -hwaccel qsv");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;

            case HardwareAcceleration.AMF:
                command.Append(" -hwaccel d3d11va");
                command.Append(" -hwaccel_output_format d3d11");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;

            case HardwareAcceleration.VideoToolbox:
                command.Append(" -hwaccel videotoolbox");
                break;

            case HardwareAcceleration.VAAPI:
                // For VAAPI, we need to initialize the device first, then set hwaccel
                var vaapiDevice = !string.IsNullOrEmpty(HardwareDevice) ? HardwareDevice : GetDefaultVAAPIDevice();
                if (string.IsNullOrEmpty(vaapiDevice))
                {
                    throw new InvalidOperationException("No VAAPI device available");
                }
                command.Append($" -vaapi_device {vaapiDevice}");
                command.Append(" -hwaccel vaapi");
                command.Append(" -hwaccel_output_format vaapi");
                break;

            case HardwareAcceleration.Auto:
                command.Append(" -hwaccel auto");
                break;
        }
    }

    private string GetFFMpegCodec(
        StreamCodec codec,
        HardwareAcceleration hwAccel = HardwareAcceleration.None
    )
    {
        if (codec == StreamCodec.Unknown)
        {
            return "copy";
        }

        if (hwAccel != HardwareAcceleration.None)
        {
            return GetHardwareCodec(codec, hwAccel);
        }

        // Software encoding (original behavior)
        return codec switch
        {
            StreamCodec.H264 => "libx264",
            StreamCodec.HEVC => "libx265",
            StreamCodec.AV1 => "libaom-av1",
            StreamCodec.VP9 => "libvpx-vp9",
            StreamCodec.VP8 => "libvpx",
            StreamCodec.AdvancedAudioCoding => "aac",
            StreamCodec.DolbyDigital => "ac3",
            StreamCodec.DolbyDigitalPlus => "eac3",
            StreamCodec.DolbyTrueHD => "truehd",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for software encoding"
            ),
        };
    }

    private void AppendVideoQualityArgs(StringBuilder command, string videoCodec)
    {
        if (string.Equals(videoCodec, "copy", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (VideoCrf.HasValue)
        {
            if (!SupportsCrf(videoCodec))
            {
                throw new NotSupportedException(
                    $"Codec {videoCodec} does not support CRF encoding"
                );
            }

            command.Append(
                $" -crf {VideoCrf.Value.ToString(CultureInfo.InvariantCulture)}"
            );
            return;
        }

        var resolvedBitrate = ResolveVideoBitrate();
        if (resolvedBitrate.HasValue)
        {
            command.Append(
                $" -b:v {Math.Max(1, resolvedBitrate.Value).ToString(CultureInfo.InvariantCulture)}"
            );
        }
    }

    private void AppendVideoResolutionArgs(StringBuilder command, string videoCodec)
    {
        if (!VideoResolution.HasValue)
        {
            return;
        }

        if (string.Equals(videoCodec, "copy", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Cannot apply scaling when copying the source video stream.");
        }

        var filter = BuildScaleFilter(VideoResolution.Value);
        if (!string.IsNullOrEmpty(filter))
        {
            command.Append($" -vf \"{filter}\"");
        }
    }

    private static string? BuildScaleFilter(EncodingResolution resolution)
    {
        var targetHeight = resolution switch
        {
            EncodingResolution.SD => 480,
            EncodingResolution.HD => 720,
            EncodingResolution.FHD => 1080,
            EncodingResolution.UHD4K => 2160,
            _ => (int?)null,
        };

        if (!targetHeight.HasValue)
        {
            return null;
        }

        return $"scale='if(gt(ih,{targetHeight.Value}),-2,iw)':'if(gt(ih,{targetHeight.Value}),{targetHeight.Value},ih)':flags=lanczos";
    }

    /// <summary>
    /// Determines if the specified FFmpeg video codec supports CRF (Constant Rate Factor) encoding.
    /// </summary>
    /// <param name="videoCodec">The FFmpeg codec name (e.g., "libx264", "h264_nvenc", "hevc_vaapi")</param>
    /// <returns>True if the codec supports CRF encoding, false otherwise</returns>
    public static bool SupportsCrf(string videoCodec)
    {
        var normalizedCodec = videoCodec.ToLowerInvariant();

        return normalizedCodec switch
        {
            // Software encoders
            "libx264" => true,
            "libx265" => true,
            "libaom-av1" => true,
            "libvpx-vp9" => true,
            "libvpx" => true,
            // Apple VideoToolbox (supports CRF-style quality control)
            "h264_videotoolbox" => true,
            "hevc_videotoolbox" => true,
            _ => false,
        };
    }

    private long? ResolveVideoBitrate()
    {
        if (VideoCrf.HasValue)
        {
            return null;
        }

        if (VideoBitrate.HasValue && VideoBitrate.Value > 0)
        {
            return VideoBitrate.Value;
        }

        if (PrimaryVideoStream is not null)
        {
            var suggestedBitrate = GetSuggestedVideoBitrate(PrimaryVideoStream);
            if (suggestedBitrate.HasValue)
            {
                return suggestedBitrate.Value;
            }
        }

        if (RequiresBitrateFallback())
        {
            return 5_000_000; // 5 Mbps fallback
        }

        return null;
    }

    private bool RequiresBitrateFallback()
    {
        if (HardwareAccel == HardwareAcceleration.VideoToolbox)
        {
            return true;
        }

        if (HardwareAccel == HardwareAcceleration.Auto && OperatingSystem.IsMacOS())
        {
            return true;
        }

        return false;
    }

    private static long? GetSuggestedVideoBitrate(MediaInfo.Stream stream)
    {
        if (stream.BitRate.HasValue && stream.BitRate.Value > 0)
        {
            return stream.BitRate.Value;
        }

        if (stream.Width.HasValue || stream.Height.HasValue)
        {
            var width = stream.Width ?? 0;
            var height = stream.Height ?? 0;

            if (width >= 3840 || height >= 2160)
            {
                return 35_000_000; // 35 Mbps for 4K
            }

            if (width >= 2560 || height >= 1440)
            {
                return 16_000_000; // 16 Mbps for 1440p
            }

            if (width >= 1920 || height >= 1080)
            {
                return 8_000_000; // 8 Mbps for 1080p
            }

            if (width >= 1280 || height >= 720)
            {
                return 5_000_000; // 5 Mbps for 720p
            }

            if (width >= 854 || height >= 480)
            {
                return 2_500_000; // 2.5 Mbps for SD
            }

            return 1_000_000; // fallback for lower resolutions
        }

        return null;
    }

    private string GetHardwareCodec(StreamCodec codec, HardwareAcceleration hwAccel)
    {
        return hwAccel switch
        {
            HardwareAcceleration.NVENC => GetNvidiaCodec(codec),
            HardwareAcceleration.QSV => GetIntelCodec(codec),
            HardwareAcceleration.AMF => GetAMDCodec(codec),
            HardwareAcceleration.VideoToolbox => GetVideoToolboxCodec(codec),
            HardwareAcceleration.VAAPI => GetVAAPICodec(codec),
            HardwareAcceleration.Auto => GetAutoCodec(codec),
            _ => throw new NotSupportedException(
                $"Hardware acceleration {hwAccel} is not supported"
            ),
        };
    }

    private string GetNvidiaCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_nvenc",
            StreamCodec.HEVC => "hevc_nvenc",
            StreamCodec.AV1 => "av1_nvenc",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for NVIDIA hardware encoding"
            ),
        };
    }

    private string GetIntelCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_qsv",
            StreamCodec.HEVC => "hevc_qsv",
            StreamCodec.AV1 => "av1_qsv",
            StreamCodec.VP9 => "vp9_qsv",
            StreamCodec.Mpeg2Video => "mpeg2_qsv",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for Intel QuickSync hardware encoding"
            ),
        };
    }

    private string GetAMDCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_amf",
            StreamCodec.HEVC => "hevc_amf",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for AMD hardware encoding"
            ),
        };
    }

    private string GetVideoToolboxCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_videotoolbox",
            StreamCodec.HEVC => "hevc_videotoolbox",
            StreamCodec.ProRes => "prores_videotoolbox",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for VideoToolbox hardware encoding"
            ),
        };
    }

    private string GetVAAPICodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_vaapi",
            StreamCodec.HEVC => "hevc_vaapi",
            StreamCodec.VP8 => "vp8_vaapi",
            StreamCodec.VP9 => "vp9_vaapi",
            StreamCodec.AV1 => "av1_vaapi",
            StreamCodec.Mpeg2Video => "mpeg2_vaapi",
            _ => throw new NotSupportedException(
                $"Codec {codec} is not supported for VA-API hardware encoding"
            ),
        };
    }

    private string GetAutoCodec(StreamCodec codec)
    {
        // For auto mode, prefer hardware acceleration but fall back to software
        // This could be enhanced with runtime detection logic
        try
        {
            // Try platform-specific hardware first
            if (OperatingSystem.IsMacOS())
                return GetVideoToolboxCodec(codec);
            else if (OperatingSystem.IsWindows())
            {
                // Try NVIDIA first, then Intel, then AMD
                try
                {
                    return GetNvidiaCodec(codec);
                }
                catch
                {
                    try
                    {
                        return GetIntelCodec(codec);
                    }
                    catch
                    {
                        return GetAMDCodec(codec);
                    }
                }
            }
            else if (OperatingSystem.IsLinux())
            {
                // Try VA-API first, then NVIDIA
                try
                {
                    // For auto mode, try to find a VAAPI device
                    var defaultDevice = GetDefaultVAAPIDevice();
                    if (!string.IsNullOrEmpty(defaultDevice))
                    {
                        HardwareDevice ??= defaultDevice;
                        return GetVAAPICodec(codec);
                    }
                }
                catch
                {
                    // Fall through to try other options
                }

                try
                {
                    return GetNvidiaCodec(codec);
                }
                catch
                {
                    // Fall back to software if both fail
                }
            }
        }
        catch
        {
            // Fall back to software encoding
        }

        return GetFFMpegCodec(codec, HardwareAcceleration.None);
    }
}
