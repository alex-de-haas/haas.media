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

| Hardware     | Video codec mapping                                                              |
| ------------ | -------------------------------------------------------------------------------- |
| NVENC        | `h264_nvenc`, `hevc_nvenc`, `av1_nvenc`                                          |
| QSV          | `h264_qsv`, `hevc_qsv`, `av1_qsv`, `vp9_qsv`, `mpeg2_qsv`                        |
| AMF          | `h264_amf`, `hevc_amf`, `av1_amf`                                                |
| VideoToolbox | `h264_videotoolbox`, `hevc_videotoolbox`, `prores_videotoolbox`                  |
| VAAPI        | `h264_vaapi`, `hevc_vaapi`, `vp8_vaapi`, `vp9_vaapi`, `av1_vaapi`, `mpeg2_vaapi` |
| None         | Falls back to software encoders (`libx264`, `libx265`, `libaom-av1`, etc.)       |

Audio streams default to `-c:a copy`. Override behaviour by adding additional FFmpeg arguments if required.

## CRF (Constant Rate Factor) Support

Software encoders and Apple's VideoToolbox support CRF encoding for quality-based encoding instead of bitrate-based encoding. Other hardware accelerators rely on constant-quantizer or global-quality parameters instead of `-crf`. CRF values range from 0 (lossless) to 51 (lowest quality), with typical values between 18-28.

### Using CRF

```csharp
await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithHardwareAcceleration(HardwareAcceleration.VideoToolbox)
    .WithVideoConstantRateFactor(23) // CRF value
    .EncodeAsync();
```

### CRF Support by Encoder

The builder's `SupportsCrf()` method determines if a specific encoder supports CRF:

| Encoder Type | H.264 | HEVC | AV1 | VP9 | VP8 |
| ------------ | ----- | ---- | --- | --- | --- |
| Software     | ✅    | ✅   | ✅  | ✅  | ✅  |
| NVENC        | ✅    | ✅   | ✅  | ❌  | ❌  |
| QSV          | ✅    | ✅   | ✅  | ❌  | ❌  |
| AMF          | ❌    | ❌   | ❌  | ❌  | ❌  |
| VideoToolbox | ✅    | ✅   | ❌  | ❌  | ❌  |
| VAAPI        | ✅    | ✅   | ✅  | ❌  | ❌  |

### Runtime CRF Detection

The `HardwareAccelerationInfo` class includes `EncoderCrfSupport` dictionary that maps each available encoder to its CRF support status:

```csharp
var hwInfo = await MediaHelper.GetHardwareAccelerationInfoAsync();
foreach (var info in hwInfo)
{
    Console.WriteLine($"{info.HardwareAcceleration}:");
    foreach (var (codec, supportsCrf) in info.EncoderCrfSupport)
    {
        Console.WriteLine($"  {codec}: CRF={supportsCrf}");
    }
}
```

This information is exposed via the `/api/encodings/info` endpoint for frontend consumption.

## Resolution Scaling

Use `WithVideoResolution()` to ask the builder to downscale output video to one of the predefined heights while preserving aspect ratio (and skipping upscale when the source is already smaller). Accepted values are `EncodingResolution.SD` (480p), `EncodingResolution.HD` (720p), `EncodingResolution.FHD` (1080p), and `EncodingResolution.UHD4K` (2160p). Passing `EncodingResolution.Source` or omitting the call keeps the original resolution.

```csharp
await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output-720p.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithVideoResolution(EncodingResolution.HD)
    .EncodeAsync();
```

### VideoToolbox Hardware Encoding

When using VideoToolbox hardware acceleration, the builder automatically applies a `format=nv12` filter even when using source resolution (no scaling). This ensures frames are properly formatted for hardware encoding and prevents fallback to CPU encoding. When scaling is applied, the format filter is combined with the scale filter.

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
