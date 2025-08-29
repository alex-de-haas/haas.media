using Haas.Media.Core;

namespace Haas.Media.Downloader.Api.Encodings;

public record EncodeRequest
{
    public HardwareAcceleration? HardwareAcceleration { get; init; }
    public required Stream[] Streams { get; init; }

    public record Stream
    {
        public required string InputFilePath { get; init; }
        public required int StreamIndex { get; init; }
        public required StreamType StreamType { get; init; }
    }
}
