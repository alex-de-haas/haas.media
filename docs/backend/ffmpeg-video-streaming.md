# FFmpeg-Based Video Streaming

## Overview

The video streaming endpoint (`api/files/stream`) now supports on-the-fly transcoding using FFmpeg for improved compatibility across different browsers and devices.

## Features

### 1. Direct Streaming (Default)
When `transcode=false` or not specified, videos are streamed directly from disk:
- ✅ Supports HTTP range requests (seeking)
- ✅ Low latency
- ✅ No CPU overhead
- ✅ Original quality
- ⚠️ Requires browser/client to support the source format

### 2. Transcoded Streaming
When `transcode=true`, videos are transcoded on-the-fly using FFmpeg:
- ✅ Ensures maximum compatibility (H.264/AAC for MP4, VP9/Opus for WebM)
- ✅ Configurable quality and format
- ✅ Streams directly (no temporary files)
- ⚠️ Does not support range requests (seeking disabled)
- ⚠️ CPU overhead during transcoding
- ⚠️ Slight latency at start

## API Usage

### Direct Streaming (Default)
```
GET /api/files/stream?path=Movies/example.mkv
```

**Response:**
- Streams original file
- Supports range requests
- Content-Type based on file extension

### Transcoded Streaming

#### Basic Transcode
```
GET /api/files/stream?path=Movies/example.mkv&transcode=true
```
Defaults to MP4 format with medium quality.

#### Specify Format
```
GET /api/files/stream?path=Movies/example.mkv&transcode=true&format=webm
```

Supported formats:
- `mp4` (H.264 video + AAC audio) - Default, best compatibility
- `webm` (VP9 video + Opus audio) - Better compression, modern browsers
- `mkv` (H.264 video + AAC audio) - Matroska container

#### Specify Quality
```
GET /api/files/stream?path=Movies/example.mkv&transcode=true&quality=high
```

Quality presets:
- `low` - CRF 28, 96kbps audio (smaller file, lower quality)
- `medium` - CRF 23, 128kbps audio (balanced, default)
- `high` - CRF 20, 192kbps audio (better quality)
- `ultra` - CRF 18, 256kbps audio (excellent quality)

*Note: Lower CRF = higher quality. CRF scale is 0 (lossless) to 51 (worst).*

#### Combined Example
```
GET /api/files/stream?path=Movies/example.mkv&transcode=true&format=mp4&quality=high
```

## Frontend Integration

### HTML5 Video Player

#### Direct Playback
```typescript
<video controls>
  <source 
    src="/api/video-stream?path=Movies/example.mp4" 
    type="video/mp4" 
  />
</video>
```

#### Transcoded Playback
```typescript
<video controls>
  <source 
    src="/api/video-stream?path=Movies/example.mkv&transcode=true&format=mp4&quality=medium" 
    type="video/mp4" 
  />
</video>
```

**Note:** When using transcoded streams, seeking will not work because the stream is generated on-the-fly and the total length is unknown.

### React/Next.js Example
```typescript
const VideoPlayer = ({ filePath, needsTranscode }: { 
  filePath: string; 
  needsTranscode?: boolean 
}) => {
  const baseUrl = '/api/video-stream';
  const params = new URLSearchParams({ path: filePath });
  
  if (needsTranscode) {
    params.set('transcode', 'true');
    params.set('format', 'mp4');
    params.set('quality', 'medium');
  }
  
  const videoUrl = `${baseUrl}?${params.toString()}`;
  
  return (
    <video controls className="w-full">
      <source src={videoUrl} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
};
```

## When to Use Transcode Mode

### Use Direct Streaming When:
- Video is already in a widely supported format (MP4 H.264)
- Client/browser supports the source format
- Seeking functionality is required
- Performance is critical (low CPU usage)

### Use Transcoded Streaming When:
- Video format is not supported by target browser (e.g., MKV, AVI)
- Video codec is incompatible (e.g., HEVC in some browsers)
- Need consistent format across all videos
- Compatibility is more important than performance

## Technical Details

### FFmpeg Command Structure
```bash
ffmpeg \
  -i "input.mkv" \
  -c:v libx264 \              # Video codec (H.264)
  -crf 23 \                   # Quality (lower = better)
  -preset fast \              # Encoding speed preset
  -c:a aac \                  # Audio codec
  -b:a 128k \                 # Audio bitrate
  -movflags +faststart+frag_keyframe+empty_moov \  # Streaming optimization
  -f mp4 \                    # Output format
  pipe:1                      # Output to stdout
```

### Streaming Optimizations
- **`-movflags +faststart`**: Moves metadata to the beginning for faster playback start
- **`-movflags +frag_keyframe`**: Enables fragmented MP4 for streaming
- **`-movflags +empty_moov`**: Creates minimal moov atom for immediate streaming
- **`-preset fast`**: Balances encoding speed with compression efficiency

### Process Flow
1. Client requests video with `transcode=true`
2. Backend starts FFmpeg process with input file
3. FFmpeg streams encoded output to stdout
4. Backend pipes stdout directly to HTTP response
5. Client receives and plays transcoded stream in real-time

### Performance Characteristics
- **CPU Usage**: ~50-200% per stream (varies by quality/resolution)
- **Memory Usage**: ~50-100MB per active transcode
- **Latency**: ~1-3 seconds before playback starts
- **Throughput**: Limited by encoding speed (typically 1-4x realtime)

## Limitations

### Transcoded Streams
1. **No Seeking**: Range requests are not supported during transcoding
2. **Unknown Duration**: Browser may not show total video length
3. **CPU Intensive**: Multiple concurrent transcodes can strain server
4. **Cannot Skip**: Must play from beginning or restart stream

### Recommended Strategy
- Detect browser/format compatibility on frontend
- Use direct streaming by default
- Fall back to transcoding only when necessary
- Consider pre-transcoding popular content for better performance

## Error Handling

### Common Issues

#### FFmpeg Not Found
```
Error: FFmpeg binary not found
```
**Solution**: Ensure FFmpeg is installed and in PATH, or configure `ffmpeg.config.json`.

#### Unsupported Format
```
Error: Unknown encoder 'libx264'
```
**Solution**: Install FFmpeg with required codecs (libx264, libvpx-vp9, aac).

#### Process Killed
```
FFmpeg process exited with code 137
```
**Solution**: Out of memory. Reduce concurrent transcodes or increase server memory.

## Future Enhancements

Potential improvements:
- [ ] Hardware acceleration support (NVENC, QSV, VAAPI)
- [ ] Adaptive bitrate streaming (HLS/DASH)
- [ ] Seek support for transcoded streams (using segment-based approach)
- [ ] Pre-transcoding queue for popular content
- [ ] Resolution scaling options
- [ ] Subtitle burn-in support

## Related Files

- `src/Haas.Media.Downloader.Api/Files/VideoStreamingService.cs` - Main streaming service
- `src/Haas.Media.Downloader.Api/Files/FilesConfiguration.cs` - API endpoint configuration
- `src/Haas.Media.Core/MediaEncodingBuilder.cs` - FFmpeg encoding builder utilities
- `src/Haas.Media.Core/FFMpeg/GlobalFFOptions.cs` - FFmpeg binary path configuration
