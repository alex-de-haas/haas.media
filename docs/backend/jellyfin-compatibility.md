# Jellyfin Compatibility Layer

The downloader API ships with a lightweight Jellyfin-compatible surface so sidecar media apps (Infuse, Kodi, etc.) can browse Haas.Media libraries, request metadata, and stream content without a dedicated Jellyfin server.

## Supported Surface Area

### Authentication & System
- `POST /jellyfin/Users/AuthenticateByName` — reuses the local authentication store and issues the standard JWT access token. `Username` and either `Pw` or `Password` are required.
- `GET /jellyfin/System/Info/Public` — exposes server, version, and OS metadata expected by Jellyfin discovery flows.
- `GET /jellyfin/System/Info` — authenticated system information endpoint.
- `GET /jellyfin/System/Ping` — returns "Pong" for health checks.
- `GET /jellyfin/Branding/Configuration` — returns branding configuration (empty by default).
- `GET /jellyfin/Users/Public` — returns list of public users for login screen.

### User Management
- `GET /jellyfin/Users` — authenticated user lookups for session handshakes.
- `GET /jellyfin/Users/Me` — returns current authenticated user information.
- `GET /jellyfin/Users/{id}` — retrieve specific user by ID.
- `GET /jellyfin/Users/{id}/Views` — returns available libraries for the authenticated user (mirrors `MediaFolders`).
- `GET /jellyfin/Users/{id}/GroupingOptions` — returns view grouping options (currently returns empty array).
- `GET /jellyfin/Sessions` — advertises the current session for clients that validate presence after login.

### Display Preferences
- `GET /jellyfin/DisplayPreferences/{displayPreferencesId}` — returns display preferences for UI customization (currently returns defaults).
- `POST /jellyfin/DisplayPreferences/{displayPreferencesId}` — accepts display preference updates (not persisted yet).

### Library & Collections
- `GET /jellyfin/Library/MediaFolders` — lists configured libraries, mapped to Jellyfin collection ids.
- `GET /jellyfin/Library/VirtualFolders` — returns virtual folder configuration (mirrors library structure with locations).

### Items & Content
- `GET /jellyfin/Users/{userId}/Items` — browse collections, series, seasons, and episodes with Jellyfin-style ids. Supports `IncludeItemTypes`, `ParentId`, `Recursive`, and `SearchTerm` filters.
- `GET /jellyfin/Items` — browse all items with filtering support.
- `GET /jellyfin/Items/{id}` — retrieve a single item including generated `MediaSources` for playback.
- `GET /jellyfin/Users/{userId}/Items/Latest` — returns latest items (up to 16 by default), sorted by premiere date.
- `GET /jellyfin/Users/{userId}/Items/Resume` — returns in-progress items (currently returns empty array until playback tracking is implemented).

### Images
- `GET /jellyfin/Items/{id}/Images/{type}` — proxies TMDb artwork (primary or backdrop) via HTTP redirects. Supports `maxWidth` and `quality=original` query parameters.

### Playback
- `GET /jellyfin/Items/{id}/PlaybackInfo` — returns the `MediaSources` payload with stream information.
- `POST /jellyfin/Items/{id}/PlaybackInfo` — alternative POST endpoint for playback info.
- `GET /jellyfin/Videos/{id}/stream` — direct or transcoded playback powered by the existing `VideoStreamingService`. Supports:
  - `static=true` — force direct stream without transcoding
  - `transcode=true` — force transcoding
  - `container` — target container format
  - `quality` — quality preset for transcoding
  - `mediaSourceId` — specific media source ID
  - `playSessionId` — playback session tracking
- `GET /jellyfin/Videos/{id}/stream.{container}` — stream with explicit container extension (e.g., `.mp4`, `.mkv`).

All IDs are stable and encode the entity type:

| Kind    | Format                                | Example                  |
| ------- | ------------------------------------- | ------------------------ |
| Library | `library-{liteDbId}`                  | `library-6623f1fbe6d...` |
| Movie   | `movie-{tmdbId}`                      | `movie-603`              |
| Series  | `series-{tmdbId}`                     | `series-1399`            |
| Season  | `season-{tmdbId}-{seasonNumber}`      | `season-1399-1`          |
| Episode | `episode-{tmdbId}-{season}-{episode}` | `episode-1399-1-1`       |

## Token Handling

Clients can authenticate with the same JWT that backs the REST API. Tokens are accepted through:

- `X-Emby-Token` or `X-MediaBrowser-Token`
- `X-Emby-Authorization: MediaBrowser ... Token="<jwt>"`
- Query parameter `api_key`
- Standard `Authorization: Bearer <jwt>` header

`AuthenticateByName` emits the JWT alongside a `SessionInfo` payload that mirrors Jellyfin's response. Tokens are validated with the configured `JWT_SECRET`, issuer, and audience. If JWT auth is disabled the Jellyfin endpoints reject authenticated operations.

After authentication most clients call `/jellyfin/Users/Me`, `/jellyfin/Users/{userId}/Views`, and `/jellyfin/Sessions`. These routes now project the local LiteDB user and active libraries so apps such as Infuse can finish their connection wizard.

## Query Parameter Support

The API now supports multiple variations of common query parameters to ensure compatibility with different client implementations:

- **Case variations**: `ParentId`, `parentId`, `ParentID`
- **Boolean parameters**: `Recursive`, `recursive`, `static`, `transcode`
- **Filtering**: `IncludeItemTypes`, `SearchTerm`, `Limit`

## Streaming Behaviour

`/jellyfin/Videos/{id}/stream` resolves the media path relative to `DATA_DIRECTORY` and hands it to the shared `VideoStreamingService`. 

**Stream Modes:**
- **Direct Play** (default): `static=true` or no transcoding params — serves original file with full range request support
- **Transcoded**: `transcode=true` — on-the-fly FFmpeg transcoding, no seeking support
- **Container-specific**: `/Videos/{id}/stream.mp4` — explicit container format in URL path

Infuse typically requests direct play while falling back to transcoding when codecs mismatch. The API logs all playback requests with item ID, static flag, transcode flag, and session information for debugging.

## Image Proxying

TMDb poster/backdrop paths stored in LiteDB are transformed into public URLs using `https://image.tmdb.org/t/p/`. Clients can request `Primary` or `Backdrop` images; optional `maxWidth` or `quality=original` parameters change the size segment.

**Supported image types:**
- `Primary` — main poster/cover art
- `Backdrop` — background/fanart images

**Size options:**
- Default: `w780` (780px width)
- Custom: `maxWidth=<pixels>` (e.g., `maxWidth=1920`)
- Original: `quality=original` (full resolution)

## Enhanced MediaSource Information

The API now returns more detailed `MediaSource` and `MediaStream` information aligned with the Jellyfin OpenAPI specification:

**MediaSource enhancements:**
- `Protocol`, `Container`, `Size`, `Name`
- `RunTimeTicks` for duration information
- `SupportsDirectPlay`, `SupportsDirectStream`, `SupportsTranscoding` flags
- `Type`, `VideoType` classification
- `DefaultAudioStreamIndex`, `DefaultSubtitleStreamIndex`

**MediaStream enhancements:**
- Video: `Codec`, `Width`, `Height`, `AspectRatio`, `BitRate`, `AverageFrameRate`, `RealFrameRate`, `Profile`, `Level`, `BitDepth`, `RefFrames`, `VideoRange`, `ColorSpace`, `ColorTransfer`, `ColorPrimaries`, `PixelFormat`, `IsInterlaced`, `IsAVC`
- Audio: `Channels`, `SampleRate`, `ChannelLayout`, `BitDepth`
- Subtitles: `IsForced`, `IsExternal`, `Path`, `SupportsExternalStream`
- Common: `Title`, `DisplayTitle`, `Language`, `IsDefault`, `CodecTag`, `TimeBase`

## Infuse-Specific Endpoints

The following endpoints were added specifically for Infuse compatibility:

1. **`/Users/{userId}/Items/Latest`** — Returns recently added content sorted by premiere date. Commonly used for "Recently Added" sections.

2. **`/Users/{userId}/Items/Resume`** — Returns in-progress content for "Continue Watching". Currently returns empty array until playback position tracking is implemented.

3. **`/Branding/Configuration`** — Returns UI customization settings. Currently returns empty branding to use Infuse defaults.

4. **Both GET and POST for `/Items/{id}/PlaybackInfo`** — Infuse may use either HTTP method to request playback information before streaming.

## Limitations & Next Steps

- `MediaStreams` codec details are currently using placeholder values. Full ffprobe metadata extraction during library scans is planned.
- Resume/played progress is not persisted; `JellyfinUserData` currently defaults to `Played = false`. Playback telemetry and progress tracking is planned.
- The `/Users/{userId}/Items/Resume` endpoint returns empty until playback position persistence is implemented.
- Live search forwards to LiteDB only; direct TMDb proxy endpoints are unchanged.
- Advanced transcoding parameters (audio channels, bitrate, quality levels, etc.) are accepted but not all are utilized by the current `VideoStreamingService`.

These gaps are tracked so the compatibility surface can grow as media scanning and playback telemetry are enhanced.

## Testing with Infuse

To test the Jellyfin API with Infuse:

1. **Add Server**: In Infuse, add a new Jellyfin server
2. **Server URL**: `http://localhost:8000/jellyfin` (or your API base URL + `/jellyfin`)
3. **Authenticate**: Use your local Haas.Media credentials
4. **Verify**: Check that libraries appear and content is browsable
5. **Playback**: Test direct play and transcoding (if codecs aren't supported)

**Expected behavior:**
- Libraries should appear as collections (Movies, TV Shows)
- Metadata, posters, and backdrops should display from TMDb
- Direct play should work for most modern codecs
- Transcoding fallback should activate for unsupported formats

**Debug logs:**
- Video stream requests are logged with item ID, parameters, and session info
- All Jellyfin endpoint responses are logged in structured JSON format
- Check API logs for authentication issues or missing content
