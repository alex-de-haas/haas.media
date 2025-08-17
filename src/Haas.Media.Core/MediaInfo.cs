using System.Globalization;

namespace Haas.Media.Core;

public record MediaInfo
{
    public required Stream[] Streams { get; set; } = [];

    public record Stream
    {
        public required int Index { get; set; }
        public required StreamType Type { get; set; }
        public required StreamCodec Codec { get; set; }
        public required StreamFeatures Features { get; set; }
        public TimeSpan Duration { get; set; }
        public CultureInfo? Language { get; set; }
        public string? Title { get; set; }
        public int? Width { get; set; }
        public int? Height { get; set; }
        public long? BitRate { get; set; }
        public int? BitDepth { get; set; }
        public int? Channels { get; set; }
        public int? SampleRate { get; set; }
    }
}

public enum StreamCodec
{
    Unknown = 0,
    H264 = 101,
    HEVC = 102,
    AdvancedAudioCoding = 201,
    DolbyDigital = 202,
    DolbyDigitalPlus = 203,
    DolbyTrueHD = 204,
}

public enum StreamType
{
    Unknown = 0,
    Video = 1,
    Audio = 2,
    Subtitle = 3,
}

[Flags]
public enum StreamFeatures
{
    None = 0,
    DolbyVision = 1 << 0,
    DolbyAtmos = 1 << 1,
}
