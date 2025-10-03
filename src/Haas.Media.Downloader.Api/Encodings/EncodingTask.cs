using System.IO;
using Haas.Media.Core;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Encodings;

public sealed class EncodingTask : BackgroundTaskBase
{
    public EncodingTask(
        string sourceRelativePath,
        EncodeRequest.Stream[] streams,
        StreamCodec videoCodec,
        HardwareAcceleration hardwareAcceleration,
        string? device
    )
    {
        SourceRelativePath = sourceRelativePath;
        Streams = streams ?? Array.Empty<EncodeRequest.Stream>();
        VideoCodec = videoCodec;
        HardwareAcceleration = hardwareAcceleration;
        Device = device;
    }

    public override string Name => $"Encode {Path.GetFileName(SourceRelativePath)}";

    public string SourceRelativePath { get; }

    public EncodeRequest.Stream[] Streams { get; }

    public StreamCodec VideoCodec { get; }

    public HardwareAcceleration HardwareAcceleration { get; }

    public string? Device { get; }
}
