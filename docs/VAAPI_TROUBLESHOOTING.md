# VAAPI Troubleshooting Guide

## Issue: "No device available for decoder: device type vaapi needed for codec hevc"

This error occurs when trying to use VAAPI (Video Acceleration API) hardware acceleration on Linux but the system cannot find or access the required hardware device.

## Root Cause

The error happens because:
1. The VAAPI device path is hardcoded or incorrect
2. The device doesn't exist or isn't accessible
3. The hardware acceleration initialization order is incorrect
4. Missing drivers or improper driver configuration

## Fix Applied

### 1. Dynamic Device Detection
- Modified `MediaHelper.cs` to dynamically detect available VAAPI devices
- Check multiple possible device paths: `/dev/dri/renderD128`, `/dev/dri/renderD129`, `/dev/dri/card0`, `/dev/dri/card1`
- Fallback gracefully if no devices are found

### 2. Proper Device Initialization Order
- Updated `MediaEncodingBuilder.cs` to initialize VAAPI device before setting hardware acceleration
- Changed command order from: `-hwaccel vaapi -vaapi_device <device>`
- To: `-vaapi_device <device> -hwaccel vaapi -hwaccel_output_format vaapi`

### 3. Device Validation
- Added validation to ensure VAAPI devices exist before attempting to use them
- Throw meaningful error messages if devices are not available
- Auto-detection of best available device

### 4. Enhanced Docker Support
- Updated Dockerfile to include Intel VA-API drivers (`intel-media-va-driver`)
- Added Mesa Vulkan drivers for better hardware support
- Set `LIBVA_MESSAGING_LEVEL=2` for better debugging

## Verification

### Check Available Devices
```bash
ls -la /dev/dri/
```

### Test VAAPI Functionality
```bash
vainfo
```

### Test FFmpeg VAAPI Support
```bash
ffmpeg -hwaccels
ffmpeg -f lavfi -i testsrc2=duration=1:size=320x240:rate=1 -vaapi_device /dev/dri/renderD128 -vf 'format=nv12,hwupload' -c:v h264_vaapi -f null -
```

## Docker Usage

When running in Docker, ensure proper device access:

```bash
docker run --device=/dev/dri:/dev/dri your-image
```

Or with docker-compose:
```yaml
services:
  your-service:
    devices:
      - /dev/dri:/dev/dri
```

## Common Issues and Solutions

### 1. Permission Issues
```bash
# Add user to video group
sudo usermod -a -G video $USER
# Or run with proper permissions
sudo chmod 666 /dev/dri/render*
```

### 2. Missing Drivers
```bash
# Ubuntu/Debian
sudo apt-get install mesa-va-drivers intel-media-va-driver

# Check driver loading
dmesg | grep -i drm
```

### 3. Multiple GPU Systems
- The system now automatically detects the best available device
- You can still manually specify a device if needed:
```csharp
.WithHardwareAcceleration(HardwareAcceleration.VAAPI, "/dev/dri/renderD129")
```

## Hardware Support Matrix

| GPU Vendor | Driver Package | Device Path | Notes |
|------------|----------------|-------------|-------|
| Intel | intel-media-va-driver | /dev/dri/renderD128 | Usually default |
| AMD | mesa-va-drivers | /dev/dri/renderD128 | AMD RADV driver |
| NVIDIA | nvidia-driver | /dev/dri/renderD128 | Limited VAAPI support |

## Testing the Fix

After applying the fixes, test with:

```csharp
var result = await MediaEncodingBuilder.Create()
    .FromFileInput("input.mp4")
    .ToFileOutput("output.mp4")
    .WithVideoCodec(StreamCodec.HEVC)
    .WithHardwareAcceleration(HardwareAcceleration.VAAPI)
    .EncodeAsync();
```

The system will now:
1. Automatically detect available VAAPI devices
2. Initialize the device properly
3. Provide clear error messages if hardware is unavailable
4. Fall back to software encoding gracefully in auto mode
