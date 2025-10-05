# FFmpeg Video Streaming - Quick Reference Card

## 🎯 Endpoint
```
GET /api/files/stream
```

## 📋 Parameters

| Parameter | Type | Default | Options | Description |
|-----------|------|---------|---------|-------------|
| `path` | string | **required** | - | Relative path to video file |
| `transcode` | boolean | `false` | `true`, `false` | Enable FFmpeg transcoding |
| `format` | string | `mp4` | `mp4`, `webm`, `mkv` | Output format (when transcoding) |
| `quality` | string | `medium` | `low`, `medium`, `high`, `ultra` | Quality preset (when transcoding) |

## ⚡ Quick Examples

### Direct Streaming (Fast, with seeking)
```bash
/api/files/stream?path=Movies/example.mp4
```

### Transcoded Streaming (Universal compatibility)
```bash
/api/files/stream?path=Movies/example.mkv&transcode=true
```

### High Quality Transcode
```bash
/api/files/stream?path=Movies/example.mkv&transcode=true&quality=high
```

## 🎨 Frontend Component

```tsx
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

// Auto-detect format and transcode if needed
<SmartVideoPlayer path="Movies/example.mkv" />

// Force high quality transcode
<SmartVideoPlayer 
  path="Movies/example.mkv"
  forceTranscode
  quality="high"
/>

// Show streaming info
<SmartVideoPlayer 
  path="Movies/example.mkv"
  showStreamInfo
/>
```

## 📊 Quality Presets

| Preset | CRF | Audio | File Size | Use Case |
|--------|-----|-------|-----------|----------|
| `low` | 28 | 96k | Small | Mobile, slow network |
| `medium` | 23 | 128k | Medium | Default, balanced |
| `high` | 20 | 192k | Large | Desktop, high quality |
| `ultra` | 18 | 256k | Largest | Premium, archival |

## 🎭 Format Support

| Format | Codec | Browser Support | Transcode? |
|--------|-------|-----------------|------------|
| MP4 | H.264/AAC | ✅ All browsers | No need |
| MKV | Various | ⚠️ Limited | Yes |
| AVI | Various | ❌ Poor | Yes |
| WebM | VP9/Opus | ✅ Modern | No need |

## ⚖️ Trade-offs

### Direct Streaming
✅ Fast (no encoding delay)  
✅ Supports seeking  
✅ Low CPU usage  
⚠️ Format must be compatible  

### Transcoded Streaming
✅ Universal compatibility  
✅ Consistent format  
⚠️ 1-3s startup delay  
⚠️ No seeking support  
⚠️ CPU intensive  

## 🔧 Utility Functions

```typescript
import { 
  shouldTranscodeVideo,
  detectStreamingStrategy,
  buildVideoStreamUrl 
} from "@/lib/video-stream-utils";

// Check if transcoding needed
shouldTranscodeVideo("movie.mkv") // true

// Detect optimal strategy
detectStreamingStrategy("movie.mkv")
// { transcode: true, format: 'mp4', reason: '...' }

// Build URL
buildVideoStreamUrl({ 
  path: "movie.mkv",
  quality: "high" 
})
// /api/video-stream?path=movie.mkv&transcode=true&format=mp4&quality=high
```

## 🚀 Performance

| Metric | Direct | Transcoded |
|--------|--------|------------|
| CPU | ~1% | 50-200% |
| Memory | ~10MB | 50-100MB |
| Latency | <50ms | 1-3s |
| Seeking | ✅ Yes | ❌ No |

## 📚 Documentation

- **Full Docs**: `docs/backend/ffmpeg-video-streaming.md`
- **Quick Start**: `docs/backend/ffmpeg-streaming-quickstart.md`
- **Frontend Examples**: `docs/frontend/smart-video-player-examples.md`
- **Testing Guide**: `docs/backend/ffmpeg-streaming-testing-guide.md`
- **Implementation Summary**: `docs/backend/ffmpeg-streaming-implementation-summary.md`

## 🐛 Troubleshooting

### Video won't play
```bash
# Check FFmpeg is installed
ffmpeg -version

# Check backend logs
# Verify file path exists
```

### Seeking doesn't work
**Cause**: Transcoding is enabled  
**Fix**: Use direct streaming or disable transcoding

### High CPU usage
**Fix**: Reduce quality preset
```bash
?quality=low
```

## 💡 Best Practices

1. **Default to direct streaming** - Only transcode when necessary
2. **Monitor CPU usage** - Limit concurrent transcodes (3-5 typical)
3. **Use appropriate quality** - Match to network conditions
4. **Consider pre-transcoding** - For popular content

## 🔑 Key Files

### Backend
- `VideoStreamingService.cs` - Core streaming service
- `FilesConfiguration.cs` - API endpoints

### Frontend
- `video-stream-utils.ts` - Utility functions
- `smart-video-player.tsx` - Smart player component
- `video-player.tsx` - Base player component

## 📝 Decision Tree

```
Need to stream video?
├─ Is file MP4?
│  ├─ Yes → Use direct streaming
│  └─ No → Check browser support
│     ├─ Supported → Use direct streaming
│     └─ Not supported → Use transcoding
└─ Need universal compatibility?
   └─ Yes → Use transcoding with format=mp4
```

## 🎯 Common Use Cases

### Play any video format
```tsx
<SmartVideoPlayer path={videoPath} />
```

### Ensure MP4 for all videos
```tsx
<SmartVideoPlayer 
  path={videoPath}
  forceTranscode
  format="mp4"
/>
```

### Mobile-optimized streaming
```tsx
<SmartVideoPlayer 
  path={videoPath}
  quality="low"
/>
```

### High-quality playback
```tsx
<SmartVideoPlayer 
  path={videoPath}
  quality="high"
/>
```

---

**Version**: 1.0  
**Last Updated**: October 2025  
**Requires**: FFmpeg installed on server
