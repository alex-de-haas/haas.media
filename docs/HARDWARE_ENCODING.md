# Hardware Encoding Support

The `MediaEncodingBuilder` now supports hardware-accelerated video encoding through various hardware acceleration APIs.

## Supported Hardware Acceleration Types

- **NVIDIA** - Uses NVENC (NVIDIA Video Encoder)
- **Intel** - Uses QuickSync Video (QSV)
- **AMD** - Uses AMF (Advanced Media Framework)
- **VideoToolbox** - Apple's hardware acceleration (macOS)
- **VA-API** - Video Acceleration API (Linux)
- **Auto** - Automatically detects and uses available hardware

## Usage Examples

### Basic Hardware Encoding

```csharp
// NVIDIA encoding
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output_nvidia.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithNvidiaEncoding()
    .EncodeAsync();

// Intel QuickSync encoding
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output_intel.mp4")
    .WithVideoCodec(StreamCodec.HEVC)
    .WithIntelQuickSync()
    .EncodeAsync();

// Apple VideoToolbox encoding (macOS)
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output_vt.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithVideoToolbox()
    .EncodeAsync();
```

### Auto-Detection

```csharp
// Automatically detect and use the best available hardware encoder
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output_auto.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithAutoHardwareAcceleration()
    .EncodeAsync();
```

### Specific Device Selection

```csharp
// Use specific GPU device for NVIDIA encoding
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.HEVC)
    .WithNvidiaEncoding("1") // Use GPU 1
    .EncodeAsync();

// Use specific device for VA-API
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithVAAPI("/dev/dri/renderD129")
    .EncodeAsync();
```

### Manual Hardware Acceleration Configuration

```csharp
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.AV1)
    .WithHardwareAcceleration(HardwareAcceleration.Nvidia, "0")
    .EncodeAsync();
```

## Codec Support by Hardware Platform

### NVIDIA (NVENC)
- H.264 (`h264_nvenc`)
- HEVC/H.265 (`hevc_nvenc`)
- AV1 (`av1_nvenc`) - RTX 40 series and newer

### Intel QuickSync (QSV)
- H.264 (`h264_qsv`)
- HEVC/H.265 (`hevc_qsv`)
- AV1 (`av1_qsv`) - 12th gen and newer
- VP9 (`vp9_qsv`)
- MPEG-2 (`mpeg2_qsv`)

### AMD (AMF)
- H.264 (`h264_amf`)
- HEVC/H.265 (`hevc_amf`)

### Apple VideoToolbox (macOS)
- H.264 (`h264_videotoolbox`)
- HEVC/H.265 (`hevc_videotoolbox`)
- ProRes (`prores_videotoolbox`)

### VA-API (Linux)
- H.264 (`h264_vaapi`)
- HEVC/H.265 (`hevc_vaapi`)
- VP8 (`vp8_vaapi`)
- VP9 (`vp9_vaapi`)
- AV1 (`av1_vaapi`)
- MPEG-2 (`mpeg2_vaapi`)

## Performance Benefits

Hardware encoding typically provides:
- **10-50x faster encoding** compared to software encoding
- **Reduced CPU usage** (encoding happens on dedicated hardware)
- **Lower power consumption** on mobile devices
- **Real-time encoding** capabilities for live streaming

## Error Handling

If hardware encoding fails (e.g., codec not supported, hardware not available), the encoding will throw a `NotSupportedException`. Consider implementing fallback logic:

```csharp
try
{
    var result = await MediaEncodingBuilder.Create()
        .FromFileInput("input.mp4")
        .ToFileOutput("output.mp4")
        .WithVideoCodec(StreamCodec.H264)
        .WithNvidiaEncoding()
        .EncodeAsync();
}
catch (NotSupportedException)
{
    // Fallback to software encoding
    var result = await MediaEncodingBuilder.Create()
        .FromFileInput("input.mp4")
        .ToFileOutput("output.mp4")
        .WithVideoCodec(StreamCodec.H264)
        // No hardware acceleration specified = software encoding
        .EncodeAsync();
}
```

Or use auto-detection which includes built-in fallback:

```csharp
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithAutoHardwareAcceleration() // Automatically falls back to software
    .EncodeAsync();
```
