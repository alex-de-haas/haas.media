using System.Text;
using Instances;

namespace Haas.Media.Core;

public enum HardwareAcceleration
{
    None = 0,
    Nvidia = 1,      // NVENC
    Intel = 2,       // QuickSync (QSV)
    AMD = 3,         // AMF
    VideoToolbox = 4, // Apple VideoToolbox (macOS)
    VAAPI = 5,       // Linux VA-API
    Auto = 99        // Auto-detect available hardware
}

public class MediaEncodingBuilder
{
    protected List<string> Outputs { get; } = [];
    protected List<string> Inputs { get; } = [];

    protected List<MediaInfo.Stream> Streams { get; } = [];

    protected StreamCodec VideoCodec { get; set; }
    protected HardwareAcceleration HardwareAccel { get; set; } = HardwareAcceleration.None;
    protected string? HardwareDevice { get; set; }

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

    public MediaEncodingBuilder WithHardwareAcceleration(HardwareAcceleration acceleration, string? device = null)
    {
        HardwareAccel = acceleration;
        HardwareDevice = device;
        return this;
    }

    public MediaEncodingBuilder WithNvidiaEncoding(string? device = null)
    {
        return WithHardwareAcceleration(HardwareAcceleration.Nvidia, device);
    }

    public MediaEncodingBuilder WithIntelQuickSync(string? device = null)
    {
        return WithHardwareAcceleration(HardwareAcceleration.Intel, device);
    }

    public MediaEncodingBuilder WithAMDEncoding(string? device = null)
    {
        return WithHardwareAcceleration(HardwareAcceleration.AMD, device);
    }

    public MediaEncodingBuilder WithVideoToolbox()
    {
        return WithHardwareAcceleration(HardwareAcceleration.VideoToolbox);
    }

    public MediaEncodingBuilder WithVAAPI(string? device = null)
    {
        return WithHardwareAcceleration(HardwareAcceleration.VAAPI, device ?? "/dev/dri/renderD128");
    }

    public MediaEncodingBuilder WithAutoHardwareAcceleration()
    {
        return WithHardwareAcceleration(HardwareAcceleration.Auto);
    }

    public MediaEncodingBuilder WithStream(MediaInfo.Stream stream)
    {
        Streams.Add(stream);
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

        command.Append($" -c:v {GetFFMpegCodec(VideoCodec, HardwareAccel)}");
        command.Append(" -c:a copy");

        command.Append($" \"{Outputs.First()}\"");

        return command.ToString();
    }

    private void AddHardwareAccelerationArgs(StringBuilder command)
    {
        switch (HardwareAccel)
        {
            case HardwareAcceleration.Nvidia:
                command.Append(" -hwaccel cuda");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;
                
            case HardwareAcceleration.Intel:
                command.Append(" -hwaccel qsv");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;
                
            case HardwareAcceleration.AMD:
                command.Append(" -hwaccel d3d11va");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;
                
            case HardwareAcceleration.VideoToolbox:
                command.Append(" -hwaccel videotoolbox");
                break;
                
            case HardwareAcceleration.VAAPI:
                command.Append(" -hwaccel vaapi");
                if (!string.IsNullOrEmpty(HardwareDevice))
                    command.Append($" -hwaccel_device {HardwareDevice}");
                break;
                
            case HardwareAcceleration.Auto:
                command.Append(" -hwaccel auto");
                break;
        }
    }

    private string GetFFMpegCodec(StreamCodec codec, HardwareAcceleration hwAccel = HardwareAcceleration.None)
    {
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
            _ => throw new NotSupportedException($"Codec {codec} is not supported for software encoding"),
        };
    }

    private string GetHardwareCodec(StreamCodec codec, HardwareAcceleration hwAccel)
    {
        return hwAccel switch
        {
            HardwareAcceleration.Nvidia => GetNvidiaCodec(codec),
            HardwareAcceleration.Intel => GetIntelCodec(codec),
            HardwareAcceleration.AMD => GetAMDCodec(codec),
            HardwareAcceleration.VideoToolbox => GetVideoToolboxCodec(codec),
            HardwareAcceleration.VAAPI => GetVAAPICodec(codec),
            HardwareAcceleration.Auto => GetAutoCodec(codec),
            _ => throw new NotSupportedException($"Hardware acceleration {hwAccel} is not supported"),
        };
    }

    private string GetNvidiaCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_nvenc",
            StreamCodec.HEVC => "hevc_nvenc",
            StreamCodec.AV1 => "av1_nvenc",
            _ => throw new NotSupportedException($"Codec {codec} is not supported for NVIDIA hardware encoding"),
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
            _ => throw new NotSupportedException($"Codec {codec} is not supported for Intel QuickSync hardware encoding"),
        };
    }

    private string GetAMDCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_amf",
            StreamCodec.HEVC => "hevc_amf",
            _ => throw new NotSupportedException($"Codec {codec} is not supported for AMD hardware encoding"),
        };
    }

    private string GetVideoToolboxCodec(StreamCodec codec)
    {
        return codec switch
        {
            StreamCodec.H264 => "h264_videotoolbox",
            StreamCodec.HEVC => "hevc_videotoolbox",
            StreamCodec.ProRes => "prores_videotoolbox",
            _ => throw new NotSupportedException($"Codec {codec} is not supported for VideoToolbox hardware encoding"),
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
            _ => throw new NotSupportedException($"Codec {codec} is not supported for VA-API hardware encoding"),
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
                try { return GetNvidiaCodec(codec); }
                catch { try { return GetIntelCodec(codec); } catch { return GetAMDCodec(codec); } }
            }
            else if (OperatingSystem.IsLinux())
            {
                // Try VA-API first, then NVIDIA
                try { return GetVAAPICodec(codec); }
                catch { return GetNvidiaCodec(codec); }
            }
        }
        catch
        {
            // Fall back to software encoding
        }

        return GetFFMpegCodec(codec, HardwareAcceleration.None);
    }
}
