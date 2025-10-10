using Haas.Media.Core;

namespace Haas.Media.Downloader.Api.Encodings;

public record EncodeRequest
{
    public required HardwareAcceleration HardwareAcceleration { get; init; }
    public required StreamCodec VideoCodec { get; init; }
    public required string? Device { get; init; }
    public required Stream[] Streams { get; init; }
    public long? VideoBitrate { get; init; }
    public double? Crf { get; init; }
    public EncodingResolution? Resolution { get; init; }

    public record Stream
    {
        public required string InputFilePath { get; init; }
        public required int StreamIndex { get; init; }
        public required StreamType StreamType { get; init; }
    }
}
