# Jellyfin API Enhancements for Infuse Client

**Date:** October 10, 2025  
**Status:** Completed

## Overview

Enhanced the Jellyfin compatibility layer in Haas.Media to improve support for Infuse and other Jellyfin-compatible clients. Changes were based on the official Jellyfin OpenAPI 10.11.0 specification.

## Changes Made

### 1. Enhanced Endpoint Coverage

#### New Endpoints

**Playback Information (GET)**
- Added `GET /jellyfin/Items/{itemId}/PlaybackInfo` to complement existing POST endpoint
- Infuse and other clients may use either GET or POST for playback info requests
- Returns `MediaSources` and `PlaySessionId` for playback initialization

**Latest Items**
- Added `GET /jellyfin/Users/{userId}/Items/Latest`
- Returns recently added content sorted by premiere date
- Supports `Limit`, `ParentId`, and `IncludeItemTypes` query parameters
- Default limit: 16 items

**Resume Items**
- Added `GET /jellyfin/Users/{userId}/Items/Resume`
- Endpoint for "Continue Watching" functionality
- Currently returns empty array (placeholder for future playback tracking)
- Supports same query parameters as Latest endpoint

**Branding Configuration**
- Added `GET /jellyfin/Branding/Configuration`
- Returns UI customization settings (empty by default)
- Allows clients to customize login screen and appearance

**Video Stream with Container Extension**
- Added `GET /jellyfin/Videos/{itemId}/stream.{container}`
- Explicit container format in URL path (e.g., `.mp4`, `.mkv`)
- Complements existing `/stream` endpoint

#### Enhanced Existing Endpoints

**Video Streaming Enhancements**
- Added support for `static` query parameter (forces direct play)
- Enhanced logging for all playback requests
- Logs include: itemId, static flag, transcode flag, container, mediaSourceId, playSessionId
- Better handling of container format negotiation

**Items Query Parameter Support**
- Added case-insensitive support for query parameters:
  - `ParentId` / `parentId` / `ParentID`
  - `Recursive` / `recursive`
  - `SearchTerm` / `searchTerm`
- Ensures compatibility with various client implementations

### 2. Enhanced Data Models

#### JellyfinMediaSource Enhancements

Added fields aligned with Jellyfin OpenAPI specification:
- `Name` - human-readable source name
- `IsRemote` - indicates if source is remote
- `ETag` - entity tag for caching
- `RunTimeTicks` - duration in ticks (100ns intervals)
- `ReadAtNativeFramerate` - playback timing flag
- `IgnoreDts`, `IgnoreIndex`, `GenPtsInput` - FFmpeg flags
- `SupportsTranscode`, `SupportsDirectPlayback` - capability flags
- `Type` - source type classification
- `VideoType` - video format classification
- `DefaultAudioStreamIndex` - default audio track
- `DefaultSubtitleStreamIndex` - default subtitle track

#### JellyfinMediaStream Enhancements

Added comprehensive codec and stream information:

**Video Stream Properties:**
- `Width`, `Height` - video dimensions
- `AspectRatio` - display aspect ratio
- `BitRate` - stream bitrate
- `AverageFrameRate`, `RealFrameRate` - frame rate information
- `Profile`, `Level` - codec profile and level
- `BitDepth` - color depth (8-bit, 10-bit, etc.)
- `RefFrames` - reference frames
- `VideoRange` - SDR/HDR range
- `ColorSpace`, `ColorTransfer`, `ColorPrimaries` - color information
- `PixelFormat` - pixel format
- `IsInterlaced` - interlacing flag
- `IsAVC` - AVC/H.264 indicator

**Audio Stream Properties:**
- `Channels` - audio channel count
- `SampleRate` - audio sample rate
- `ChannelLayout` - channel layout (5.1, 7.1, etc.)
- `BitDepth` - audio bit depth

**Subtitle Stream Properties:**
- `IsForced` - forced subtitle flag
- `IsExternal` - external subtitle file
- `Path` - external file path
- `SupportsExternalStream` - external streaming capability

**Common Properties:**
- `Title`, `DisplayTitle` - stream title
- `Language` - language code
- `IsDefault` - default stream flag
- `CodecTag` - codec four-character code
- `TimeBase` - stream timebase

### 3. Documentation Updates

Updated `/docs/backend/jellyfin-compatibility.md` with:
- Complete endpoint reference organized by category
- Query parameter support documentation
- Streaming behavior details
- Image proxying documentation
- Enhanced MediaSource/MediaStream information reference
- Infuse-specific endpoint documentation
- Testing guide with Infuse
- Limitations and roadmap

## API Compliance

The implementation now aligns with the following Jellyfin OpenAPI 10.11.0 endpoints:

- ✅ `/Users/AuthenticateByName` (POST)
- ✅ `/System/Info` (GET)
- ✅ `/System/Info/Public` (GET)
- ✅ `/System/Ping` (GET)
- ✅ `/Branding/Configuration` (GET)
- ✅ `/Users` (GET)
- ✅ `/Users/Me` (GET)
- ✅ `/Users/{userId}` (GET)
- ✅ `/Users/{userId}/Views` (GET)
- ✅ `/Users/{userId}/Items` (GET)
- ✅ `/Users/{userId}/Items/Latest` (GET)
- ✅ `/Users/{userId}/Items/Resume` (GET)
- ✅ `/Items` (GET)
- ✅ `/Items/{itemId}` (GET)
- ✅ `/Items/{itemId}/PlaybackInfo` (GET, POST)
- ✅ `/Items/{itemId}/Images/{type}` (GET)
- ✅ `/Videos/{itemId}/stream` (GET)
- ✅ `/Videos/{itemId}/stream.{container}` (GET)
- ✅ `/Library/MediaFolders` (GET)
- ✅ `/Sessions` (GET)

## Testing Recommendations

### Manual Testing with Infuse

1. **Setup**
   - Launch Haas.Media API: `dotnet run --project src/Haas.Media.Aspire`
   - Open Infuse app on iOS/tvOS/macOS
   - Add server: `http://localhost:8000/jellyfin`

2. **Authentication**
   - Use local Haas.Media credentials
   - Verify successful authentication
   - Check that user information displays correctly

3. **Library Browsing**
   - Verify all libraries appear (Movies, TV Shows)
   - Browse into libraries and verify content
   - Check that metadata displays (titles, descriptions, posters)
   - Verify season/episode hierarchy for TV shows

4. **Playback**
   - Test direct play with supported codecs
   - Test transcoding with unsupported codecs (if applicable)
   - Verify seeking works in direct play mode
   - Check audio track selection
   - Check subtitle selection (if available)

5. **Latest & Resume**
   - Check "Recently Added" section
   - Verify latest content appears and is sorted correctly
   - Note: Resume/Continue Watching will be empty until playback tracking is implemented

### Debug Verification

Check logs for:
- Successful authentication requests
- Library enumeration requests
- Item browsing requests
- PlaybackInfo requests before playback
- Video stream requests with parameters
- Any errors or warnings

## Future Enhancements

### Short Term
- **FFprobe Integration**: Extract real codec information during metadata scans
- **Media Analysis**: Populate actual resolution, bitrate, codec details in MediaStreams
- **Playback Tracking**: Implement playback position persistence for resume functionality

### Medium Term
- **Progress Reporting**: Implement `/Sessions/Playing` and `/Sessions/Playing/Progress` endpoints
- **Watched Status**: Track and persist watched/unwatched state
- **User Preferences**: Per-user subtitle and audio preferences
- **Advanced Search**: Enhanced search with filters and sorting

### Long Term
- **Transcoding Profiles**: Client-specific transcoding profiles
- **Subtitle Management**: External subtitle file support and on-the-fly conversion
- **Multi-user Support**: Enhanced multi-user features with separate libraries/permissions
- **Activity Logging**: Detailed playback activity and statistics

## Known Limitations

1. **MediaStream Placeholder Data**: Currently using placeholder codec values. Real values require ffprobe integration during metadata scanning.

2. **No Resume Support**: The `/Users/{userId}/Items/Resume` endpoint returns empty until playback position tracking is implemented.

3. **Limited Transcoding Parameters**: Many advanced transcoding parameters (audio channels, specific bitrates, quality levels) are accepted but not fully utilized.

4. **No Watched State**: `JellyfinUserData` always shows `Played = false` as playback tracking is not yet implemented.

5. **Single User Focus**: While multi-user endpoints exist, the system is primarily designed for single-user scenarios currently.

## Related Files

- `/src/Haas.Media.Downloader.Api/Jellyfin/JellyfinConfiguration.cs` - Endpoint definitions
- `/src/Haas.Media.Downloader.Api/Jellyfin/JellyfinModels.cs` - Data models
- `/src/Haas.Media.Downloader.Api/Jellyfin/JellyfinService.cs` - Service implementation
- `/src/Haas.Media.Downloader.Api/Jellyfin/JellyfinAuthService.cs` - Authentication
- `/docs/backend/jellyfin-compatibility.md` - Complete API documentation

## Build Status

✅ All changes compiled successfully with no errors (5 pre-existing warnings unrelated to these changes)
