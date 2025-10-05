# Testing Guide: FFmpeg Video Streaming

## Prerequisites

1. **FFmpeg installed** - Verify with:
   ```bash
   ffmpeg -version
   ```

2. **Test video files** - Have various formats available:
   - `test.mp4` (H.264) - Should stream directly
   - `test.mkv` (Matroska) - Should trigger transcoding
   - `test.avi` (AVI) - Should trigger transcoding

3. **Backend running** - Start the API:
   ```bash
   dotnet run --project src/Haas.Media.Downloader.Api
   ```

## Backend API Testing

### Test 1: Direct Streaming (MP4)
```bash
curl -i "http://localhost:5000/api/files/stream?path=Movies/test.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- Status: `200 OK` or `206 Partial Content`
- Header: `Accept-Ranges: bytes`
- Header: `Content-Type: video/mp4`
- Video starts playing immediately

### Test 2: Direct Streaming with Range Request
```bash
curl -i "http://localhost:5000/api/files/stream?path=Movies/test.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Range: bytes=0-1048575"
```

**Expected:**
- Status: `206 Partial Content`
- Header: `Content-Range: bytes 0-1048575/[filesize]`
- Header: `Content-Length: 1048576`
- Exactly 1MB of data returned

### Test 3: Transcoding (MKV to MP4)
```bash
curl -i "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- Status: `200 OK`
- Header: `Content-Type: video/mp4`
- No `Content-Range` header (seeking not supported)
- Stream starts after 1-3 seconds (encoding latency)

### Test 4: High Quality Transcoding
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true&quality=high" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o output.mp4
```

**Expected:**
- File downloads and plays properly
- Better visual quality than default
- Larger file size

### Test 5: WebM Format
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true&format=webm" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o output.webm
```

**Expected:**
- Status: `200 OK`
- Header: `Content-Type: video/webm`
- File plays in modern browsers

### Test 6: Invalid Path
```bash
curl -i "http://localhost:5000/api/files/stream?path=Movies/nonexistent.mp4" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- Status: `404 Not Found`
- Body: `"File not found"`

## Frontend Testing

### Test 7: SmartVideoPlayer with MP4
Create a test page:

```tsx
// app/test/video/page.tsx
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

export default function TestPage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Video Test - MP4</h1>
      <SmartVideoPlayer 
        path="Movies/test.mp4"
        showStreamInfo
      />
    </div>
  );
}
```

**Expected:**
- Video plays immediately
- Seeking works
- Info shows "Streaming Mode: Direct"

### Test 8: SmartVideoPlayer with MKV
```tsx
<SmartVideoPlayer 
  path="Movies/test.mkv"
  showStreamInfo
/>
```

**Expected:**
- Info shows "Streaming Mode: Transcoded"
- Video plays after short delay
- Note about seeking being disabled

### Test 9: Quality Selection
```tsx
"use client";
import { useState } from "react";
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

export default function TestPage() {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');
  
  return (
    <div className="p-8">
      <select value={quality} onChange={(e) => setQuality(e.target.value as any)}>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      
      <SmartVideoPlayer 
        path="Movies/test.mkv"
        quality={quality}
        showStreamInfo
      />
    </div>
  );
}
```

**Expected:**
- Quality changes are reflected in URL
- Visual difference in video quality

## Performance Testing

### Test 10: CPU Usage (Single Stream)
1. Start transcoding:
   ```bash
   curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -o /dev/null
   ```

2. Monitor CPU:
   ```bash
   # macOS
   top -pid $(pgrep ffmpeg)
   
   # Linux
   htop -p $(pgrep ffmpeg)
   ```

**Expected:**
- CPU usage: 50-200% (varies by file and quality)
- Memory: 50-100MB

### Test 11: Multiple Concurrent Streams
Open 3-5 terminal windows and run simultaneously:
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true&quality=low" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o /dev/null
```

**Monitor:**
- Overall system CPU usage
- API memory usage
- Response latency

**Expected:**
- Each stream uses ~50-100% CPU
- System should handle 3-5 concurrent streams on typical hardware

### Test 12: Large File Streaming
Test with large file (>2GB):
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/large-movie.mkv&transcode=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o output.mp4
```

**Expected:**
- Stream starts without waiting for full file processing
- Memory usage remains constant (~50-100MB)
- No timeout errors

## Browser Compatibility Testing

### Test 13: Cross-Browser Testing
Test in each browser:
- Chrome/Edge (Chromium)
- Firefox
- Safari (macOS/iOS)

**Test Matrix:**

| Format | Chrome | Firefox | Safari |
|--------|--------|---------|--------|
| Direct MP4 | ✅ | ✅ | ✅ |
| Transcode MKV→MP4 | ✅ | ✅ | ✅ |
| Transcode→WebM | ✅ | ✅ | ❌* |

*Safari has limited WebM support

### Test 14: Mobile Testing
Test on mobile devices:
- iOS Safari
- Android Chrome

**Check:**
- Video loads and plays
- Controls work properly
- Fullscreen works
- No excessive data usage

## Error Handling Testing

### Test 15: FFmpeg Not Available
1. Temporarily rename FFmpeg:
   ```bash
   sudo mv /usr/local/bin/ffmpeg /usr/local/bin/ffmpeg.bak
   ```

2. Try transcoding:
   ```bash
   curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

**Expected:**
- Error logged in backend
- 500 response or graceful error

3. Restore FFmpeg:
   ```bash
   sudo mv /usr/local/bin/ffmpeg.bak /usr/local/bin/ffmpeg
   ```

### Test 16: Client Disconnect
1. Start streaming:
   ```bash
   curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -o output.mp4
   ```

2. Press Ctrl+C after 2-3 seconds

**Expected:**
- FFmpeg process terminates
- No zombie processes
- Log shows "Transcode stream cancelled by client"

### Test 17: Corrupted File
Try streaming a corrupted video file:
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/corrupted.mkv&transcode=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected:**
- Error logged with FFmpeg stderr output
- Graceful error response

## Integration Testing

### Test 18: End-to-End Playback
1. Upload a video file
2. View it in the web interface
3. Play the video
4. Seek to different positions (if not transcoding)
5. Adjust volume
6. Toggle fullscreen

**Expected:**
- Smooth playback experience
- All controls work properly
- No console errors

### Test 19: Utility Functions
Test in browser console:

```javascript
// Test auto-detection
import { shouldTranscodeVideo, detectStreamingStrategy } from '@/lib/video-stream-utils';

console.log(shouldTranscodeVideo('test.mp4')); // false
console.log(shouldTranscodeVideo('test.mkv')); // true

const strategy = detectStreamingStrategy('test.mkv');
console.log(strategy); 
// { transcode: true, format: 'mp4', reason: '...' }
```

## Stress Testing

### Test 20: Rapid Start/Stop
Start and stop streams rapidly:
```bash
for i in {1..10}; do
  curl "http://localhost:5000/api/files/stream?path=Movies/test.mkv&transcode=true" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -o /dev/null &
  sleep 0.5
  killall curl
done
```

**Expected:**
- No memory leaks
- All FFmpeg processes terminate
- API remains responsive

### Test 21: Long Duration Stream
Stream entire large file:
```bash
curl "http://localhost:5000/api/files/stream?path=Movies/long-movie.mkv&transcode=true" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o output.mp4
```

**Expected:**
- Completes successfully
- Memory usage remains stable throughout
- No connection timeouts

## Automated Test Script

Create `test-video-streaming.sh`:

```bash
#!/bin/bash

API_URL="http://localhost:5000"
TOKEN="YOUR_TOKEN"

echo "Testing Video Streaming API..."

# Test 1: Direct streaming
echo -n "Test 1 - Direct streaming: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/api/files/stream?path=Movies/test.mp4" \
  -H "Authorization: Bearer ${TOKEN}")
[ "$STATUS" = "200" ] && echo "✅ PASS" || echo "❌ FAIL ($STATUS)"

# Test 2: Range request
echo -n "Test 2 - Range request: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/api/files/stream?path=Movies/test.mp4" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Range: bytes=0-1024")
[ "$STATUS" = "206" ] && echo "✅ PASS" || echo "❌ FAIL ($STATUS)"

# Test 3: Transcoding
echo -n "Test 3 - Transcoding: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/api/files/stream?path=Movies/test.mkv&transcode=true" \
  -H "Authorization: Bearer ${TOKEN}")
[ "$STATUS" = "200" ] && echo "✅ PASS" || echo "❌ FAIL ($STATUS)"

# Test 4: Invalid path
echo -n "Test 4 - Invalid path: "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  "${API_URL}/api/files/stream?path=Movies/nonexistent.mp4" \
  -H "Authorization: Bearer ${TOKEN}")
[ "$STATUS" = "404" ] && echo "✅ PASS" || echo "❌ FAIL ($STATUS)"

echo "Tests complete!"
```

Run with:
```bash
chmod +x test-video-streaming.sh
./test-video-streaming.sh
```

## Checklist

Before deploying to production:

- [ ] All API tests pass
- [ ] Frontend components render correctly
- [ ] Video playback works in target browsers
- [ ] CPU usage is acceptable under load
- [ ] Memory usage is stable
- [ ] Error handling works properly
- [ ] FFmpeg is installed on production server
- [ ] Proper logging is in place
- [ ] Performance benchmarks documented
- [ ] User documentation updated

## Troubleshooting Common Issues

### Issue: Video won't play
**Check:**
1. FFmpeg installed: `ffmpeg -version`
2. File path correct and accessible
3. Backend logs for errors
4. Network tab in browser DevTools

### Issue: High CPU usage
**Solutions:**
1. Reduce quality preset (`quality=low`)
2. Limit concurrent transcodes
3. Use direct streaming when possible

### Issue: Seeking doesn't work
**Cause:** Transcoding is enabled
**Solution:** Use direct streaming or wait for video to complete transcoding

### Issue: Playback stutters
**Check:**
1. Network speed
2. Server CPU usage
3. Client device performance
4. Reduce quality if needed

## Metrics to Monitor

In production, monitor:
1. **Active transcode sessions** - Number of concurrent FFmpeg processes
2. **Average CPU usage** - Per transcode and overall
3. **Memory usage** - Per transcode and overall  
4. **Stream duration** - How long users watch
5. **Error rates** - Failed streams, timeouts
6. **Format distribution** - Which formats need transcoding most
