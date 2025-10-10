# Video Streaming Optimization

## Problem: High Memory Usage with Range Requests

When using the ShadCN-based HTML5 video player, the browser makes HTTP range requests to stream video efficiently. However, the Next.js proxy route (`/api/video-stream`) was buffering the entire response in memory using `response.arrayBuffer()` before sending it to the client.

### Issues with Buffering Approach

1. **Memory exhaustion**: Large video files (e.g., 2GB movie) would consume 2GB of Node.js memory
2. **Slow initial response**: Had to wait for entire range to download before sending first byte
3. **Failed range requests**: Couldn't handle large range headers efficiently
4. **No streaming**: Defeated the purpose of HTTP range requests

## Solution: Stream Response Body Directly

Changed the proxy to stream the response body directly without buffering:

### Before (Buffering)

```typescript
// Get response body as array buffer
const buffer = await response.arrayBuffer(); // ❌ Loads entire response into memory

// Return the video stream
return new NextResponse(buffer, {
  status: response.status,
  headers: responseHeaders,
});
```

**Problems:**

- Blocks until entire range is downloaded
- Uses memory proportional to range size
- No backpressure handling

### After (Streaming)

```typescript
// Stream the response directly without buffering
// This is crucial for large video files and proper range request handling
return new NextResponse(response.body, {
  // ✅ Streams directly
  status: response.status,
  headers: responseHeaders,
});
```

**Benefits:**

- ✅ **Zero buffering**: Starts sending data immediately
- ✅ **Constant memory**: Uses only streaming buffer (typically <64KB)
- ✅ **Backpressure**: Node.js automatically throttles based on client speed
- ✅ **Large files**: Can stream multi-GB files without memory issues

## How HTTP Range Requests Work

### Initial Request (Metadata)

```
GET /api/video-stream?path=movie.mkv
Range: bytes=0-0
```

Browser requests 1 byte to check if server supports ranges.

**Backend response:**

```
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-0/2147483648
Content-Length: 1
Accept-Ranges: bytes
```

### Playback Request (First Chunk)

```
GET /api/video-stream?path=movie.mkv
Range: bytes=0-1048575
```

Browser requests first ~1MB for playback start.

### Seek Request (Jump to 50%)

```
GET /api/video-stream?path=movie.mkv
Range: bytes=1073741824-1074790399
```

Browser requests 1MB starting at 50% of file.

## Backend Range Handling

The backend (`FilesConfiguration.cs`) properly handles range requests using `LimitedStream`:

```csharp
var (start, end) = range.Value;
var length = end - start + 1;

fileStream.Seek(start, SeekOrigin.Begin);

// Use a limited stream to ensure only 'length' bytes are read
var limitedStream = new LimitedStream(fileStream, length);

context.Response.StatusCode = 206; // Partial Content
context.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileInfo.Length}";
context.Response.ContentType = contentType;
context.Response.Headers.AcceptRanges = "bytes";

return Results.Stream(limitedStream, contentType, fileInfo.Name);
```

**Key points:**

- Seeks to `start` position in file
- Wraps stream in `LimitedStream` to prevent over-reading
- Sets proper 206 status and `Content-Range` header
- Returns stream directly (no buffering)

## Next.js Proxy Streaming

The Next.js route now properly proxies the stream:

```typescript
// Fetch from downstream API
const response = await fetch(apiUrl, {
  headers: {
    Authorization: `Bearer ${token}`,
    Range: range, // Forward range header
  },
  method: "GET",
});

// Stream the response directly without buffering
return new NextResponse(response.body, {
  // response.body is a ReadableStream
  status: response.status,
  headers: responseHeaders,
});
```

## Performance Benefits

### Before (with buffering)

```
Memory usage: O(range_size)
Time to first byte: O(range_size / network_speed)
Max file size: Limited by Node.js heap (~2GB)

Example: 100MB range request
- Memory: 100MB
- TTFB: 1-2 seconds (on fast connection)
```

### After (with streaming)

```
Memory usage: O(stream_buffer) ≈ 64KB
Time to first byte: O(network_latency) ≈ 10-50ms
Max file size: Unlimited (streams disk → network)

Example: 100MB range request
- Memory: ~64KB
- TTFB: 10-50ms
```

## Testing

### Test 1: Small Range (Metadata Check)

```bash
curl -H "Range: bytes=0-0" http://localhost:3000/api/video-stream?path=Downloads/movie.mkv
```

**Expected:** 1 byte response, instant

### Test 2: Normal Range (Playback)

```bash
curl -H "Range: bytes=0-1048575" http://localhost:3000/api/video-stream?path=Downloads/movie.mkv -o chunk.bin
```

**Expected:** 1MB downloaded, starts immediately

### Test 3: Large File Seeking

Open a 4GB video in browser, seek to 75% → should be instant, no memory spike

## Related Files

- `src/Haas.Media.Web/app/api/video-stream/route.ts` - Next.js streaming proxy
- `src/Haas.Media.Downloader.Api/Files/FilesConfiguration.cs` - Backend range handler
- `src/Haas.Media.Downloader.Api/Files/LimitedStream.cs` - Stream wrapper
- `src/Haas.Media.Web/components/ui/video-player.tsx` - ShadCN video player component

## Browser Compatibility

All modern browsers support HTTP range requests for `<video>` elements:

- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Troubleshooting

### Symptom: Video won't seek

**Cause:** Backend not returning `Accept-Ranges: bytes` or `Content-Range` headers  
**Fix:** Check backend logs, ensure range parsing works

### Symptom: High memory usage during playback

**Cause:** Still using `arrayBuffer()` somewhere  
**Fix:** Ensure using `response.body` (ReadableStream) not `arrayBuffer()`

### Symptom: Slow initial load

**Cause:** Not handling metadata request (first 0-0 range)  
**Fix:** Backend should handle single-byte ranges efficiently

## Additional Optimizations

### Consider Direct Backend Streaming (Optional)

For production, consider having the video player hit the backend directly with the auth token in a header, bypassing the Next.js proxy entirely:

```typescript
// In video player component
const videoUrl = useMemo(() => {
  const token = getToken(); // from context/session
  return `${backendUrl}/api/files/stream?path=${path}&token=${token}`;
}, [path]);
```

**Pros:**

- Eliminates Next.js hop (one less network round-trip)
- Reduces frontend server load
- Better performance for large files

**Cons:**

- Exposes backend URL to client
- Token needs to be embedded in URL or custom header
- More complex authentication flow
