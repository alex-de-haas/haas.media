# Audio Playback Fix

## Problem
Videos were playing without sound due to two issues:

### Issue 1: Video Player - Uninitialized Audio State
The `VideoPlayer` component had state variables for volume and muted status, but these were never applied to the actual HTML5 video element when the component mounted.

**Symptoms:**
- Video plays but no audio
- Volume slider doesn't work initially
- Mute button doesn't reflect actual state

**Root Cause:**
```tsx
// State was initialized
const [isMuted, setIsMuted] = React.useState(false);
const [volume, setVolume] = React.useState(100);

// But never applied to the video element on mount
<video ref={videoRef} src={src} ... />
```

### Issue 2: FFmpeg - Wrong Audio Codec for WebM
When transcoding to WebM format, the service was using AAC audio codec, which is incompatible with WebM containers. WebM requires Opus or Vorbis audio.

**Root Cause:**
```csharp
// Always used AAC regardless of format
"-c:a aac",
$"-b:a {audioBitrate}",
```

## Solutions Implemented

### Fix 1: Initialize Video Element Audio Properties

Added proper initialization of video element audio properties:

```tsx
// Initialize video element properties
React.useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  // Initialize volume and muted state
  video.volume = volume / 100;
  video.muted = isMuted;
}, [volume, isMuted]);

// Also set on video load
React.useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  // Set initial volume when video loads
  video.volume = volume / 100;
  video.muted = isMuted;
  
  // ... rest of event handlers
}, [onTimeUpdate, volume, isMuted]);
```

**Changes:**
- Added dedicated `useEffect` to sync volume/muted state with video element
- Set initial audio properties when video loads
- Added `volume` and `isMuted` to event handler dependencies

### Fix 2: Format-Specific Audio Codecs

Updated FFmpeg transcoding to use appropriate audio codecs:

```csharp
// Select appropriate audio codec based on output format
var audioCodec = format switch
{
    "webm" => "libopus",  // Opus for WebM
    "mp4" => "aac",       // AAC for MP4
    "mkv" => "aac",       // AAC for MKV
    _ => "aac"
};

var args = new List<string>
{
    // ...
    $"-c:a {audioCodec}",
    $"-b:a {audioBitrate}",
};

// Add format-specific optimization flags
if (format == "mp4")
{
    args.Add("-movflags +faststart+frag_keyframe+empty_moov");
}
```

**Changes:**
- Dynamic audio codec selection based on output format
- Opus (libopus) for WebM containers
- AAC for MP4 and MKV containers
- Moved MP4-specific flags to conditional block

## Audio Codec Compatibility

### MP4 Container
- **Video Codecs**: H.264 (libx264), H.265 (libx265)
- **Audio Codecs**: AAC ✅, MP3 ✅, AC3 ✅
- **Not Compatible**: Opus ❌, Vorbis ❌

### WebM Container
- **Video Codecs**: VP8, VP9
- **Audio Codecs**: Opus ✅, Vorbis ✅
- **Not Compatible**: AAC ❌, MP3 ❌

### MKV Container (Matroska)
- **Video Codecs**: Almost any (H.264, H.265, VP9, etc.)
- **Audio Codecs**: Almost any (AAC ✅, Opus ✅, MP3 ✅, etc.)
- **Most Compatible**: AAC, MP3

## Testing

### Test Audio on Direct Playback (MP4)
1. Select an MP4 video file
2. Click Play
3. Verify:
   - ✅ Audio plays immediately
   - ✅ Volume slider controls volume
   - ✅ Mute button works
   - ✅ Default volume is 100%

### Test Audio on Transcoded Playback (MKV → MP4)
1. Select an MKV video file
2. Transcode plays with `format=mp4`
3. Verify:
   - ✅ Audio plays after brief transcode delay
   - ✅ Audio is in sync with video
   - ✅ Volume controls work

### Test Audio on WebM Transcoding
1. Select any video file
2. Transcode with `format=webm`
3. Verify:
   - ✅ Audio plays (now using Opus codec)
   - ✅ Plays in modern browsers (Chrome, Firefox, Edge)
   - ⚠️ May not play in Safari (limited WebM support)

### Test Volume Persistence
1. Play a video
2. Adjust volume to 50%
3. Seek or pause/resume
4. Verify:
   - ✅ Volume stays at 50%
   - ✅ No unexpected muting

## Browser Compatibility

### Audio Codec Support

| Codec | Chrome | Firefox | Safari | Edge |
|-------|--------|---------|--------|------|
| AAC | ✅ | ✅ | ✅ | ✅ |
| MP3 | ✅ | ✅ | ✅ | ✅ |
| Opus | ✅ | ✅ | ⚠️ Limited | ✅ |
| Vorbis | ✅ | ✅ | ❌ | ✅ |

### Recommended Formats

**For Maximum Compatibility:**
```
MP4 container + H.264 video + AAC audio
```

**For Modern Browsers:**
```
WebM container + VP9 video + Opus audio
```

**For Quality/Size:**
```
MKV container + H.265 video + AAC audio
```

## FFmpeg Audio Options

### Current Implementation
```bash
# MP4
ffmpeg -i input.mkv -c:v libx264 -c:a aac -b:a 128k -f mp4 pipe:1

# WebM
ffmpeg -i input.mkv -c:v libvpx-vp9 -c:a libopus -b:a 128k -f webm pipe:1
```

### Audio Bitrate Guidelines

| Quality | Bitrate | Use Case |
|---------|---------|----------|
| Low | 96kbps | Voice, mobile |
| Medium | 128kbps | Standard quality |
| High | 192kbps | Music, high quality |
| Ultra | 256kbps | Studio quality |

### Audio Sample Rate
- **Default**: Auto (source sample rate)
- **For AAC**: 48kHz or 44.1kHz recommended
- **For Opus**: 48kHz recommended

## Troubleshooting

### Still No Audio?

**Check Browser Console:**
```javascript
// In browser console while video is playing
const video = document.querySelector('video');
console.log('Muted:', video.muted);
console.log('Volume:', video.volume);
console.log('Audio tracks:', video.audioTracks?.length);
```

**Check FFmpeg Stderr:**
Look for errors like:
```
Stream #0:1: Audio: aac, 48000 Hz, stereo, fltp
[aac @ ...] Specified sample format is invalid
```

**Verify Audio Stream Exists:**
```bash
ffprobe input.mkv
# Look for: Stream #0:1(eng): Audio: ...
```

### Audio Out of Sync

**Causes:**
- Frame rate mismatch
- Audio delay in source
- Transcoding issues

**Solution:**
Add audio sync option to FFmpeg:
```csharp
args.Add("-af aresample=async=1");
```

### Low Audio Volume

**Causes:**
- Source audio is quiet
- Volume normalization needed

**Solution:**
Add audio filter:
```csharp
args.Add("-af volume=2.0");  // Double volume
```

## Performance Impact

### Audio Encoding CPU Usage

| Codec | CPU Usage | Speed |
|-------|-----------|-------|
| AAC | Low-Medium | Fast |
| Opus | Medium | Medium |
| Vorbis | Medium-High | Slower |

**Recommendation:** Use AAC for MP4 and Opus for WebM for best balance.

## Future Enhancements

Potential audio improvements:

1. **Audio Normalization**
   - Automatically adjust audio levels
   - Prevent clipping/distortion

2. **Multi-Track Audio**
   - Select audio track (different languages)
   - Mix multiple audio tracks

3. **Audio-Only Streaming**
   - Extract audio for podcast-style playback
   - Lower bandwidth usage

4. **Advanced Audio Processing**
   - Noise reduction
   - Equalization
   - Dynamic range compression

## Files Modified

### Frontend
- **`components/ui/video-player.tsx`** - Added audio initialization

### Backend
- **`Files/VideoStreamingService.cs`** - Format-specific audio codecs

## Related Documentation

- [FFmpeg Video Streaming](./ffmpeg-video-streaming.md)
- [Video Player Component](../frontend/video-player.md)
- [Audio Codec Support](https://developer.mozilla.org/en-US/docs/Web/Media/Formats/Audio_codecs)
