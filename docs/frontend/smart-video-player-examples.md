# Smart Video Player - Usage Examples

## Overview
The `SmartVideoPlayer` component automatically detects when video transcoding is needed and constructs the appropriate streaming URL.

## Basic Usage

### Simple Auto-Detection
The player automatically detects if transcoding is needed based on file format:

```tsx
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

export default function VideoPage() {
  return (
    <SmartVideoPlayer 
      path="Movies/Sintel.mkv"  // MKV will be transcoded automatically
    />
  );
}
```

### Direct Streaming (MP4)
MP4 files stream directly without transcoding:

```tsx
<SmartVideoPlayer 
  path="Movies/Sintel.mp4"  // Streams directly, supports seeking
/>
```

## Advanced Usage

### Force Transcoding
Force transcoding even for compatible formats:

```tsx
<SmartVideoPlayer 
  path="Movies/Sintel.mp4"
  forceTranscode
  quality="high"
/>
```

### Specify Output Format
Choose specific output format when transcoding:

```tsx
<SmartVideoPlayer 
  path="Movies/Sintel.mkv"
  format="webm"  // Transcode to WebM instead of MP4
  quality="high"
/>
```

### Show Streaming Information
Display streaming strategy to users (useful for debugging):

```tsx
<SmartVideoPlayer 
  path="Movies/Sintel.mkv"
  showStreamInfo  // Shows alert with streaming details
/>
```

### With Quality Presets
Control transcoding quality:

```tsx
// Low quality (good for mobile/slow connections)
<SmartVideoPlayer 
  path="Movies/Sintel.mkv"
  quality="low"
/>

// High quality (better for desktop)
<SmartVideoPlayer 
  path="Movies/Sintel.mkv"
  quality="high"
/>

// Ultra quality (best quality, larger file)
<SmartVideoPlayer 
  path="Movies/Sintel.mkv"
  quality="ultra"
/>
```

## Real-World Examples

### Movie Library Page
```tsx
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";
import { Card } from "@/components/ui/card";

interface Movie {
  title: string;
  path: string;
  poster: string;
}

export function MoviePlayer({ movie }: { movie: Movie }) {
  return (
    <Card className="p-4">
      <h2 className="text-2xl font-bold mb-4">{movie.title}</h2>
      <SmartVideoPlayer 
        path={movie.path}
        poster={movie.poster}
        quality="high"
        className="w-full aspect-video"
      />
    </Card>
  );
}
```

### With Time Tracking
Track playback progress:

```tsx
"use client";

import { useState } from "react";
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

export function VideoWithProgress({ path }: { path: string }) {
  const [progress, setProgress] = useState(0);

  const handleTimeUpdate = (currentTime: number, duration: number) => {
    const percentage = (currentTime / duration) * 100;
    setProgress(percentage);
    
    // Save to localStorage or API
    localStorage.setItem(`video-${path}`, currentTime.toString());
  };

  return (
    <div>
      <SmartVideoPlayer 
        path={path}
        onTimeUpdate={handleTimeUpdate}
      />
      <div className="mt-2 text-sm text-muted-foreground">
        Progress: {progress.toFixed(1)}%
      </div>
    </div>
  );
}
```

### Format Selector
Let users choose format and quality:

```tsx
"use client";

import { useState } from "react";
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function VideoWithOptions({ path }: { path: string }) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high' | 'ultra'>('medium');
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">Quality</label>
          <Select value={quality} onValueChange={setQuality}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="ultra">Ultra</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-sm font-medium">Format</label>
          <Select value={format} onValueChange={setFormat}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4">MP4</SelectItem>
              <SelectItem value="webm">WebM</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <SmartVideoPlayer 
        path={path}
        forceTranscode
        quality={quality}
        format={format}
        showStreamInfo
      />
    </div>
  );
}
```

### Responsive Player with Adaptive Quality
```tsx
"use client";

import { useEffect, useState } from "react";
import { SmartVideoPlayer } from "@/components/ui/smart-video-player";

export function AdaptiveVideoPlayer({ path }: { path: string }) {
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    // Detect connection speed
    const connection = (navigator as any).connection;
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === '4g') {
        setQuality('high');
      } else if (effectiveType === '3g') {
        setQuality('medium');
      } else {
        setQuality('low');
      }
    }
  }, []);

  return (
    <SmartVideoPlayer 
      path={path}
      quality={quality}
      className="w-full"
    />
  );
}
```

## Direct URL Building (without component)

If you need to build URLs manually:

```tsx
import { buildVideoStreamUrl } from "@/lib/video-stream-utils";

// Simple URL
const url1 = buildVideoStreamUrl({ path: "Movies/Sintel.mkv" });
// Result: /api/video-stream?path=Movies%2FSintel.mkv&transcode=true&format=mp4&quality=medium

// Custom options
const url2 = buildVideoStreamUrl({ 
  path: "Movies/Sintel.mkv",
  forceTranscode: true,
  format: "webm",
  quality: "high"
});
// Result: /api/video-stream?path=Movies%2FSintel.mkv&transcode=true&format=webm&quality=high
```

## Utility Functions

### Check if transcoding is needed
```tsx
import { shouldTranscodeVideo } from "@/lib/video-stream-utils";

if (shouldTranscodeVideo("movie.mkv")) {
  console.log("This video needs transcoding");
}
```

### Detect streaming strategy
```tsx
import { detectStreamingStrategy } from "@/lib/video-stream-utils";

const strategy = detectStreamingStrategy("movie.mkv");
console.log(strategy);
// { transcode: true, format: 'mp4', reason: 'Format MKV requires transcoding for compatibility' }
```

### Get format information
```tsx
import { getFormatInfo } from "@/lib/video-stream-utils";

const info = getFormatInfo('mp4');
console.log(info);
// {
//   name: 'MP4 (H.264)',
//   videoCodec: 'H.264',
//   audioCodec: 'AAC',
//   description: 'Best compatibility across all browsers and devices',
//   browserSupport: 'excellent'
// }
```

## Performance Tips

1. **Use direct streaming by default** - Only enable transcoding when necessary
2. **Choose appropriate quality** - Use 'low' or 'medium' for mobile devices
3. **Preload metadata** - The component uses `preload="metadata"` by default
4. **Monitor server resources** - Each transcode uses significant CPU

## Troubleshooting

### Video won't play
- Check the `path` parameter is correct
- Verify FFmpeg is installed on the server
- Check browser console for errors

### Seeking doesn't work
- Seeking is disabled during transcoding
- Use direct streaming if seeking is required
- Check if `transcode=true` is in the URL

### Poor video quality
- Increase quality preset: `quality="high"` or `quality="ultra"`
- Consider pre-transcoding files for better quality control

### High CPU usage on server
- Reduce quality preset to `"low"` or `"medium"`
- Limit concurrent video streams
- Consider adding queue management for transcode requests
