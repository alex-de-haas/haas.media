# Video Streaming Content-Length Mismatch Fix

## Problem

When streaming video files with HTTP range requests, the server threw:

```
System.InvalidOperationException: Response Content-Length mismatch: too many bytes written (131072 of 2).
```

This occurred at line 77 in `FilesConfiguration.cs` when handling range requests (206 Partial Content responses).

## Root Cause

The original code:
1. Set `Content-Length` header to the range size (e.g., `end - start + 1`)
2. Called `fileStream.CopyToAsync(context.Response.Body)` which read **the entire remaining file** instead of just the requested range
3. Kestrel detected the mismatch between the declared Content-Length and actual bytes written

## Solution

Created `LimitedStream` wrapper that enforces a maximum read length:

### Files Changed

1. **`Files/LimitedStream.cs`** (new)
   - Wraps any `Stream` and limits read operations to exactly `maxLength` bytes
   - Implements `Read`, `ReadAsync`, and `ValueTask<int> ReadAsync` overloads
   - Returns 0 when the limit is reached, preventing over-reading

2. **`Files/FilesConfiguration.cs`**
   - Replaced manual range handling (line 61-79)
   - Now wraps `fileStream` in `LimitedStream(fileStream, length)` for range requests
   - Uses `Results.Stream()` which properly handles disposal and Content-Length
   - Removed manual `CopyToAsync` and `Results.Empty` pattern

### Before

```csharp
var (start, end) = range.Value;
var length = end - start + 1;

fileStream.Seek(start, SeekOrigin.Begin);
context.Response.StatusCode = 206;
context.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileInfo.Length}";
context.Response.Headers.ContentLength = length;
context.Response.ContentType = contentType;
context.Response.Headers.AcceptRanges = "bytes";

await fileStream.CopyToAsync(context.Response.Body);  // ❌ reads entire file
await fileStream.DisposeAsync();
return Results.Empty;
```

### After

```csharp
var (start, end) = range.Value;
var length = end - start + 1;

fileStream.Seek(start, SeekOrigin.Begin);

// Use a limited stream to ensure only 'length' bytes are read
var limitedStream = new LimitedStream(fileStream, length);

context.Response.StatusCode = 206;
context.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileInfo.Length}";
context.Response.ContentType = contentType;
context.Response.Headers.AcceptRanges = "bytes";

return Results.Stream(limitedStream, contentType, fileInfo.Name);  // ✅ reads exactly 'length' bytes
```

## Benefits

- ✅ **Correct Content-Length**: `LimitedStream` guarantees exactly `length` bytes are read
- ✅ **No manual disposal**: `Results.Stream()` handles cleanup automatically
- ✅ **Reusable**: `LimitedStream` can be used for any scenario requiring bounded reads
- ✅ **Async-safe**: Properly implements all async read methods

## Testing

Build verification:
```bash
dotnet build src/Haas.Media.Downloader.Api/Haas.Media.Downloader.Api.csproj
# ✅ Build succeeded
```

Expected behavior after restart:
- Video player loads and plays without exceptions
- Seeking (scrubbing) works correctly
- Range requests (206 responses) have matching Content-Length headers
- No `InvalidOperationException` in backend logs

## Related Issues

- Fixes Content-Length mismatch exception
- Enables proper HTTP range request support for video streaming
- Required for HTML5 video player seeking functionality
