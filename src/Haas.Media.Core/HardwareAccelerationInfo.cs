namespace Haas.Media.Core;

public class HardwareAccelerationInfo
{
    public HardwareAcceleration HardwareAcceleration { get; set; }
    public string[] Devices { get; set; } = [];
    public StreamCodec[] Encoders { get; set; } = [];
    public StreamCodec[] Decoders { get; set; } = [];
    
    /// <summary>
    /// Dictionary mapping each encoder codec to whether it supports CRF (Constant Rate Factor) encoding.
    /// CRF provides quality-based encoding instead of bitrate-based encoding.
    /// </summary>
    public Dictionary<StreamCodec, bool> EncoderCrfSupport { get; set; } = new();
}
