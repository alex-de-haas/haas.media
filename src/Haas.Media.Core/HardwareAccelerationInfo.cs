namespace Haas.Media.Core;

public class HardwareAccelerationInfo
{
    public HardwareAcceleration HardwareAcceleration { get; set; }
    public string[] Devices { get; set; } = Array.Empty<string>();
    public StreamCodec[] Encoders { get; set; } = Array.Empty<StreamCodec>();
    public StreamCodec[] Decoders { get; set; } = Array.Empty<StreamCodec>();
}
