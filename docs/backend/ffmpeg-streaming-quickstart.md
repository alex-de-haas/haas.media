# Quick Start: FFmpeg Video Streaming

## Overview

The `/api/files/stream` endpoint now supports FFmpeg-based transcoding for better browser compatibility.

## Quick Examples

### 1. Direct Streaming (Default - with seeking support)

```
GET /api/files/stream?path=Movies/example.mkv
```

✅ Fast, supports seeking, original quality

### 2. Basic Transcoding (ensure compatibility)

```
GET /api/files/stream?path=Movies/example.mkv&transcode=true
```

✅ Works everywhere, no seeking

### 3. High Quality MP4

```
GET /api/files/stream?path=Movies/example.mkv&transcode=true&format=mp4&quality=high
```

### 4. WebM for Modern Browsers

```
GET /api/files/stream?path=Movies/example.mkv&transcode=true&format=webm&quality=medium
```

## Parameters

| Parameter   | Values                   | Default  | Description                       |
| ----------- | ------------------------ | -------- | --------------------------------- |
| `path`      | string                   | required | Relative path to video file       |
| `transcode` | true/false               | false    | Enable FFmpeg transcoding         |
| `format`    | mp4, webm, mkv           | mp4      | Output format (when transcoding)  |
| `quality`   | low, medium, high, ultra | medium   | Quality preset (when transcoding) |

## Quality Presets

| Preset | CRF | Audio Bitrate | Use Case                      |
| ------ | --- | ------------- | ----------------------------- |
| low    | 28  | 96kbps        | Mobile, bandwidth constrained |
| medium | 23  | 128kbps       | Default, balanced             |
| high   | 20  | 192kbps       | Desktop, high quality         |
| ultra  | 18  | 256kbps       | Premium viewing               |

## Format Support

| Format | Video Codec | Audio Codec | Browser Support    |
| ------ | ----------- | ----------- | ------------------ |
| mp4    | H.264       | AAC         | All browsers ✅    |
| webm   | VP9         | Opus        | Modern browsers ✅ |
| mkv    | H.264       | AAC         | Limited ⚠️         |

## Frontend Usage

### React Component

```tsx
const VideoPlayer = ({ path }: { path: string }) => {
  const url = `/api/video-stream?path=${encodeURIComponent(path)}&transcode=true`;

  return (
    <video controls className="w-full">
      <source src={url} type="video/mp4" />
    </video>
  );
};
```

### With Format Detection

```tsx
const shouldTranscode = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  // Transcode if not MP4
  return ext !== "mp4";
};

const VideoPlayer = ({ path }: { path: string }) => {
  const params = new URLSearchParams({ path });

  if (shouldTranscode(path)) {
    params.set("transcode", "true");
    params.set("format", "mp4");
  }

  return (
    <video controls>
      <source src={`/api/video-stream?${params}`} type="video/mp4" />
    </video>
  );
};
```

## Decision Tree

```
Is video already MP4 H.264?
├─ Yes → Use direct streaming
└─ No
   └─ Does browser support format?
      ├─ Yes → Use direct streaming
      └─ No → Use transcoding
```

## Performance Tips

1. **Use direct streaming by default** - Only transcode when necessary
2. **Limit concurrent transcodes** - Each stream uses significant CPU
3. **Consider pre-transcoding** - For popular content, transcode ahead of time
4. **Use appropriate quality** - Lower quality for mobile/slow connections

## Troubleshooting

### Video won't play

- Check FFmpeg is installed: `ffmpeg -version`
- Check file path is correct and accessible
- Look at server logs for FFmpeg errors

### Seeking doesn't work

- Transcoded streams don't support seeking
- Use direct streaming if seeking is required

### High CPU usage

- Reduce quality preset (e.g., use "low" instead of "high")
- Limit concurrent transcoding sessions
- Consider hardware acceleration (future feature)

## Next Steps

See [ffmpeg-video-streaming.md](./ffmpeg-video-streaming.md) for complete documentation.
