# Audio Playback Fix - Summary

## Problem

Videos were playing without sound.

## Root Causes

### 1. Frontend Issue

The video player's volume and muted state were not initialized on the HTML5 video element.

**Fix:** Added `useEffect` hooks to properly initialize and sync audio properties.

### 2. Backend Issue

Wrong audio codec for WebM format - was using AAC (incompatible) instead of Opus.

**Fix:** Dynamic audio codec selection based on output format.

## Changes

### Frontend

**File:** `src/Haas.Media.Web/components/ui/video-player.tsx`

```tsx
// Added audio initialization
React.useEffect(() => {
  const video = videoRef.current;
  if (!video) return;
  video.volume = volume / 100;
  video.muted = isMuted;
}, [volume, isMuted]);
```

### Backend

**File:** `src/Haas.Media.Downloader.Api/Files/VideoStreamingService.cs`

```csharp
// Format-specific audio codecs
var audioCodec = format switch
{
    "webm" => "libopus",  // Opus for WebM ✅
    "mp4" => "aac",       // AAC for MP4 ✅
    "mkv" => "aac",       // AAC for MKV ✅
    _ => "aac"
};
```

## Audio Codec Matrix

| Format | Video Codec | Audio Codec | Browser Support |
| ------ | ----------- | ----------- | --------------- |
| MP4    | H.264       | AAC ✅      | All browsers    |
| WebM   | VP9         | Opus ✅     | Modern browsers |
| MKV    | H.264       | AAC ✅      | Limited         |

## Testing Checklist

- [x] ✅ Audio plays on direct MP4 playback
- [x] ✅ Audio plays on transcoded MKV → MP4
- [x] ✅ Audio plays on transcoded → WebM (with Opus)
- [x] ✅ Volume controls work
- [x] ✅ Mute/unmute works
- [x] ✅ Volume persists during playback
- [x] ✅ Build succeeds

## Quick Test

```bash
# 1. Start the app
dotnet run --project src/Haas.Media.Aspire

# 2. Open browser and play a video
# 3. Verify audio is working
# 4. Test volume controls
```

## What to Expect Now

✅ **Direct Streaming (MP4):**

- Audio works immediately
- Volume at 100% by default
- All audio controls functional

✅ **Transcoded Streaming (MKV → MP4):**

- Audio works after transcode starts
- AAC audio codec (universal compatibility)
- Synced with video

✅ **WebM Streaming:**

- Audio works with Opus codec
- Works in Chrome, Firefox, Edge
- May have limited Safari support

## Troubleshooting

### No Audio?

1. Check browser console for errors
2. Ensure volume is not at 0%
3. Check if video is muted (mute button)
4. Verify FFmpeg has audio codec support:
   ```bash
   ffmpeg -codecs | grep -E "opus|aac"
   ```

### Audio Out of Sync?

- May need to add audio sync filter
- Check source video for audio delay

## Performance Impact

- **AAC encoding:** Low CPU, fast
- **Opus encoding:** Medium CPU, medium speed
- **No impact on direct streaming**

## Documentation

- [Full Audio Fix Documentation](./audio-playback-fix.md)
- [FFmpeg Streaming Guide](./ffmpeg-video-streaming.md)

---

**Status:** ✅ Fixed and tested  
**Date:** October 5, 2025  
**Priority:** Critical (audio is essential for video playback)
