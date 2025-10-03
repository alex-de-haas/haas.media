# Ryzen AI 9 HX 370 with Radeon 890M - Docker VAAPI Setup

## Issue Resolution

The "VAAPI device not found or not accessible" error on Ryzen AI 9 HX 370 with Radeon 890M (RDNA 3.5) in Docker is caused by:

1. **Missing device mapping** - Docker container doesn't have access to /dev/dri devices
2. **Newer GPU enumeration** - 890M might use higher numbered render devices
3. **Container build-time detection** - Device files may not be accessible during image build

## Solution Applied

### 1. Enhanced Device Detection

- Added support for additional device paths (`/dev/dri/renderD130`, `/dev/dri/card2`)
- Container-aware device detection that defers validation to runtime
- Graceful fallback for newer AMD GPU device enumeration

### 2. Docker Configuration

Updated Dockerfile with AMD RDNA 3.5 specific packages:

- `firmware-amd-graphics` for 890M firmware
- `libgl1-mesa-dri` for proper DRI support
- `libxcb-dri3-0` for modern DRI3 interface

### 3. Runtime Device Mapping

Container needs proper device access - see usage examples below.

## Docker Usage Examples

### Docker Run

```bash
docker run -it --rm \
  --device=/dev/dri:/dev/dri \
  --group-add video \
  -v /path/to/media:/app/data \
  your-media-app:latest
```

### Docker Compose

```yaml
version: "3.8"
services:
  media-app:
    build: .
    devices:
      - /dev/dri:/dev/dri
    group_add:
      - video
    volumes:
      - ./data:/app/data
    environment:
      - LIBVA_DRIVER_NAME=radeonsi
      - LIBVA_MESSAGING_LEVEL=2
```

### Advanced Configuration for 890M

```yaml
version: "3.8"
services:
  media-app:
    build: .
    devices:
      - /dev/dri/renderD128:/dev/dri/renderD128
      - /dev/dri/renderD129:/dev/dri/renderD129
      - /dev/dri/renderD130:/dev/dri/renderD130 # For newer GPUs
      - /dev/dri/card0:/dev/dri/card0
    group_add:
      - video
    volumes:
      - ./data:/app/data
    environment:
      - LIBVA_DRIVER_NAME=radeonsi
      - LIBVA_DRIVERS_PATH=/usr/lib/x86_64-linux-gnu/dri
      - LIBVA_MESSAGING_LEVEL=2
      - AMD_VULKAN_ICD=RADV
      - RADV_PERFTEST=gpl
```

## Host System Requirements

### 1. AMD GPU Drivers

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y amdgpu-dkms firmware-amd-graphics mesa-va-drivers

# Check driver loading
lsmod | grep amdgpu
dmesg | grep -i amdgpu
```

### 2. Verify VAAPI Support

```bash
# Check available devices
ls -la /dev/dri/

# Test VAAPI functionality
vainfo

# Expected output should show AMD Radeon 890M support
```

### 3. Permissions

```bash
# Add user to video group
sudo usermod -a -G video $USER

# Verify device permissions
ls -la /dev/dri/
# Should show video group access
```

## Troubleshooting

### Check Container Device Access

```bash
# Inside running container
ls -la /dev/dri/
vainfo
```

### Test FFmpeg VAAPI

```bash
# Test H.264 encoding
ffmpeg -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc2=duration=5:size=1920x1080:rate=30 -vf 'format=nv12,hwupload' -c:v h264_vaapi -f null -

# Test HEVC encoding (if supported)
ffmpeg -vaapi_device /dev/dri/renderD128 -f lavfi -i testsrc2=duration=5:size=1920x1080:rate=30 -vf 'format=nv12,hwupload' -c:v hevc_vaapi -f null -
```

### Debug Output

```bash
# Enable verbose VAAPI logging
export LIBVA_MESSAGING_LEVEL=2
export LIBVA_TRACE=/tmp/vaapi.log
```

## Code Usage

With the fixes applied, you can now use:

```csharp
// Auto-detection (recommended)
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.HEVC)
    .WithVAAPI() // Automatically finds best device
    .EncodeAsync();

// Specific device (if needed)
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.H264)
    .WithVAAPI("/dev/dri/renderD130") // Specify device
    .EncodeAsync();
```

## Performance Notes

The Radeon 890M (RDNA 3.5) supports:

- **H.264 encoding/decoding** - Full hardware acceleration
- **HEVC encoding/decoding** - Full hardware acceleration
- **AV1 decoding** - Hardware accelerated
- **VP9 decoding** - Hardware accelerated

Expected performance improvement: **15-30x faster** than software encoding for H.264/HEVC.
