# Video Player Feature

## Overview

Added the ability to view media files using a custom video player built with shadcn UI components. The video player provides a full-featured viewing experience with controls for playback, volume, seeking, and fullscreen mode.

## Components

### Video Player (`components/ui/video-player.tsx`)

A fully-featured video player component with the following features:

- **Playback Controls**: Play/pause, skip forward (10s), skip backward (10s)
- **Volume Control**: Adjustable volume slider and mute toggle
- **Progress Bar**: Seekable timeline showing current time and total duration
- **Fullscreen Mode**: Toggle fullscreen viewing
- **Keyboard Shortcuts**:
  - `Space` or `K`: Play/pause
  - `Arrow Left`: Skip backward 10 seconds
  - `Arrow Right`: Skip forward 10 seconds
  - `M`: Mute/unmute
  - `F`: Toggle fullscreen
- **Auto-hide Controls**: Controls fade out after 3 seconds of inactivity during playback
- **Buffering Indicator**: Shows loading spinner when video is buffering
- **Range Request Support**: Optimized for video streaming

### Video Player Dialog (`components/ui/video-player-dialog.tsx`)

A dialog component that displays the video player in a modal overlay. Provides:
- Full-width video display (max-width: 6xl)
- Close button overlay
- Accessibility support with proper ARIA labels

### Video Player Hook (`features/files/hooks/use-video-player.ts`)

A custom React hook for managing video player state:
- `openVideo(path, title)`: Opens the video player with the specified file
- `closeVideo()`: Closes the video player
- `isOpen`: Boolean state for dialog visibility
- `videoUrl`: Current video URL
- `videoTitle`: Current video title

## Backend API

### Backend Streaming Endpoint (`api/files/stream`)

Added a new endpoint to the Files API for streaming video files:

**Endpoint**: `GET /api/files/stream?path={relativePath}`

**Features**:
- Range request support (HTTP 206 Partial Content) for efficient video streaming
- Content type detection based on file extension
- Security: Prevents path traversal attacks
- Supports common video formats: mp4, mkv, webm, avi, mov, wmv, flv, m4v, mpg, mpeg, ogv, 3gp
- **Requires Authorization**: Bearer token required in Authorization header

**Response Headers**:
- `Accept-Ranges: bytes`
- `Content-Range`: (for partial content requests)
- `Content-Type`: Appropriate video MIME type

### Frontend Proxy Endpoint (`/api/video-stream`)

Since HTML5 video elements cannot send custom headers (like Authorization), a Next.js API route proxies video streams with authentication:

**Endpoint**: `GET /api/video-stream?path={relativePath}`

**Features**:
- Authenticates using Auth0 session
- Adds Authorization header to downstream API request
- Proxies range requests for video seeking
- Forwards all necessary response headers (Content-Type, Content-Range, etc.)
- Error handling for unauthorized access

**Flow**:
1. Video player requests `/api/video-stream?path={relativePath}`
2. Next.js API route authenticates user and gets access token
3. Makes authenticated request to backend `/api/files/stream`
4. Streams response back to video player with appropriate headers

## Integration

### Files Page

The video player is integrated into the Files page (`app/files/page.tsx`):
- Added "Play video" option in the file actions dropdown menu
- Only shows for supported video file formats
- Opens the video player dialog when selected

### Media Files List

The video player is integrated into the Media Files List component:
- Added "Play" button in the card header for each media file
- Opens the video player dialog to view the file
- Useful for previewing media files before encoding

## Supported Video Formats

- MP4 (`.mp4`)
- Matroska (`.mkv`)
- WebM (`.webm`)
- AVI (`.avi`)
- QuickTime (`.mov`)
- Windows Media Video (`.wmv`)
- Flash Video (`.flv`)
- M4V (`.m4v`)
- MPEG (`.mpg`, `.mpeg`)
- Ogg Video (`.ogv`)
- 3GPP (`.3gp`)

## Usage Example

### Opening a Video from Files Page

1. Navigate to the Files page
2. Find a video file in the list
3. Click the more actions button (⋯)
4. Select "Play video"
5. The video player dialog will open and begin loading the video

### Opening a Video from Media Info Page

1. Navigate to the Media Info page for a video file
2. In the media files list, click the "Play" button
3. The video player dialog will open and begin loading the video

## Technical Details

### Video Streaming

The backend uses HTTP range requests to enable efficient video streaming:
- Browsers can request specific byte ranges of the video file
- Enables seeking to different positions in the video without downloading the entire file
- Returns 206 Partial Content status with appropriate Content-Range headers

### Security

Path traversal protection is implemented:
- All file paths are normalized and validated
- Access is restricted to files within the configured DATA_DIRECTORY
- Returns 403 Forbidden for attempts to access files outside the allowed directory

### Accessibility

- Keyboard navigation support for all controls
- ARIA labels for screen readers
- Semantic HTML with proper focus management

### Error Handling

The video player includes comprehensive error handling:

**Playback Errors**:
- `MEDIA_ERR_ABORTED`: Video playback was aborted
- `MEDIA_ERR_NETWORK`: Network error occurred while loading video
- `MEDIA_ERR_DECODE`: Video decoding failed
- `MEDIA_ERR_SRC_NOT_SUPPORTED`: Video format not supported

**Authentication Errors**:
- 401 Unauthorized: User session expired or not authenticated
- 403 Forbidden: User doesn't have access to the requested file
- 404 Not Found: File doesn't exist

All errors are displayed in a user-friendly overlay on the video player with an appropriate error message.
