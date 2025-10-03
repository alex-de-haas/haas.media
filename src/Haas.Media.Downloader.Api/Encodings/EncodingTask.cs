using Haas.Media.Core;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Encodings;

public sealed class EncodingTask : BackgroundTaskBase
{
    public EncodingTask(
        string outputPath,
        Stream[] streams,
        StreamCodec videoCodec,
        HardwareAcceleration hardwareAcceleration,
        string? device
    )
    {
        OutputPath = outputPath ?? throw new ArgumentNullException(nameof(outputPath));
        Streams = streams ?? throw new ArgumentNullException(nameof(streams));
        VideoCodec = videoCodec;
        HardwareAcceleration = hardwareAcceleration;
        Device = device;
    }

    public override string Name => "Encode media file";

    public string OutputPath { get; }

    public Stream[] Streams { get; }

    public StreamCodec VideoCodec { get; }

    public HardwareAcceleration HardwareAcceleration { get; }

    public string? Device { get; }

    public sealed class Stream
    {
        public required string InputFilePath { get; init; }
        public required int StreamIndex { get; init; }
        public required StreamType StreamType { get; init; }
    }
}
