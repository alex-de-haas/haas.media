# Hardware Encoding Support

`MediaEncodingBuilder` wraps FFmpeg invocation and optionally enables hardware acceleration. The builder exposes a single entry point for all hardware types rather than bespoke helper methods.

## Supported Accelerators
- `HardwareAcceleration.NVENC` — NVIDIA GPUs (`-hwaccel cuda`).
- `HardwareAcceleration.QSV` — Intel Quick Sync.
- `HardwareAcceleration.AMF` — AMD cards on Windows (`d3d11va`).
- `HardwareAcceleration.VideoToolbox` — Apple silicon and macOS systems.
- `HardwareAcceleration.VAAPI` — Linux VA-API devices (`/dev/dri/*`).
- `HardwareAcceleration.Auto` — best-effort detection based on the host OS with fallback to software encoding if nothing matches.

## Using the Builder

```csharp
using Haas.Media.Core;

await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithHardwareAcceleration(HardwareAcceleration.NVENC)
    .EncodeAsync();
```

The overload accepts an optional `device` argument. For NVENC/QSV/AMF this maps to `-hwaccel_device`. For VAAPI it must point at a valid `/dev/dri/*` path.

```csharp
await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.HEVC)
    .WithHardwareAcceleration(HardwareAcceleration.VAAPI, "/dev/dri/renderD129")
    .EncodeAsync();
```

### Helper Shortcuts
- `WithVAAPI()` calls `WithHardwareAcceleration(HardwareAcceleration.VAAPI, device)` and auto-detects the device path if omitted via `GetDefaultVAAPIDevice()`.
- `WithAutoHardwareAcceleration()` chooses an encoder based on the running OS (VideoToolbox on macOS, NVENC/QSV/AMF on Windows, VAAPI or NVENC on Linux) and falls back to software if all hardware attempts fail.

### Software Fallback Example
```csharp
try
{
    await MediaEncodingBuilder.Create()
        .FromFileInput("input.mp4")
        .ToFileOutput("output-nvenc.mp4")
        .WithVideoCodec(StreamCodec.H264)
        .WithHardwareAcceleration(HardwareAcceleration.NVENC, device: "0")
        .EncodeAsync();
}
catch (NotSupportedException)
{
    await MediaEncodingBuilder.Create()
        .FromFileInput("input.mp4")
        .ToFileOutput("output-libx264.mp4")
        .WithVideoCodec(StreamCodec.H264)
        .EncodeAsync();
}
```

## FFmpeg Codec Mapping
Hardware selection influences the encoder name passed to FFmpeg:

| Hardware | Video codec mapping |
| --- | --- |
| NVENC | `h264_nvenc`, `hevc_nvenc`, `av1_nvenc` |
| QSV | `h264_qsv`, `hevc_qsv`, `av1_qsv`, `vp9_qsv`, `mpeg2_qsv` |
| AMF | `h264_amf`, `hevc_amf` |
| VideoToolbox | `h264_videotoolbox`, `hevc_videotoolbox`, `prores_videotoolbox` |
| VAAPI | `h264_vaapi`, `hevc_vaapi`, `vp8_vaapi`, `vp9_vaapi`, `av1_vaapi`, `mpeg2_vaapi` |
| None | Falls back to software encoders (`libx264`, `libx265`, `libaom-av1`, etc.) |

Audio streams default to `-c:a copy`. Override behaviour by adding additional FFmpeg arguments if required.

## VAAPI Device Guardrails
When VAAPI is requested, the builder validates the supplied or auto-detected device path. Missing devices throw `InvalidOperationException`. The search order is `/dev/dri/renderD128`, `renderD129`, `card0`, `card1`.

## Auto Mode Logic
`HardwareAcceleration.Auto` tries platform-specific hardware in order:
- macOS → VideoToolbox
- Windows → NVENC → QSV → AMF
- Linux → VAAPI (with device discovery) → NVENC

If every attempt throws, the builder reuses the software codec mapping and proceeds with CPU encoding.

## Related Resources
- Encoding endpoints are summarised in [API.md](../API.md).
- The encoding background service lives in `EncodingService` (see `src/Haas.Media.Downloader.Api/Encodings`).
