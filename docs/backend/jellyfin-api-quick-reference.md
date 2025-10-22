# Jellyfin API Quick Reference for Infuse

This is a quick reference for the most commonly used Jellyfin endpoints by Infuse and similar clients.

## Base URL

All endpoints are prefixed with `/jellyfin`

Example: `http://localhost:8000/jellyfin/System/Info`

## Authentication Flow

### 1. Get Public System Info (Optional)

```http
GET /jellyfin/System/Info/Public
```

No authentication required. Returns server version and capabilities.

### 2. Get Public Users

```http
GET /jellyfin/Users/Public
```

Returns list of users for login screen.

### 3. Authenticate

```http
POST /jellyfin/Users/AuthenticateByName
Content-Type: application/json

{
  "Username": "your-username",
  "Password": "your-password"
}
```

Returns:

```json
{
  "AccessToken": "jwt-token-here",
  "User": { "Id": "...", "Name": "..." },
  "SessionInfo": { "Id": "...", "DeviceId": "...", ... }
}
```

### 4. Use Token

Pass token in one of these ways:

- Header: `Authorization: Bearer <token>`
- Header: `X-Emby-Token: <token>`
- Query: `?api_key=<token>`

## Core Endpoints

### Get User Info

```http
GET /jellyfin/Users/Me
Authorization: Bearer <token>
```

### Get Libraries

```http
GET /jellyfin/Library/MediaFolders
Authorization: Bearer <token>
```

Returns your movie and TV show libraries.

### Browse Library Contents

```http
GET /jellyfin/Users/{userId}/Items?ParentId={libraryId}&Recursive=true
Authorization: Bearer <token>
```

Query parameters:

- `ParentId` - Library or folder ID
- `Recursive` - Include all descendants
- `IncludeItemTypes` - Filter by type (Movie, Series, Season, Episode)
- `SearchTerm` - Search query

### Get Single Item

```http
GET /jellyfin/Items/{itemId}
Authorization: Bearer <token>
```

Returns full item details including `MediaSources` for playback.

### Get Latest Items

```http
GET /jellyfin/Users/{userId}/Items/Latest?Limit=16
Authorization: Bearer <token>
```

Returns recently added content.

### Get Item Image

```http
GET /jellyfin/Items/{itemId}/Images/Primary?maxWidth=780
Authorization: Bearer <token>
```

Image types: `Primary`, `Backdrop`

## Playback Flow

### 1. Get Playback Info

```http
GET /jellyfin/Items/{itemId}/PlaybackInfo
Authorization: Bearer <token>
```

Returns `MediaSources` with stream URLs and codec information.

### 2. Stream Video

**Direct Play (recommended):**

```http
GET /jellyfin/Videos/{itemId}/stream?static=true
Authorization: Bearer <token>
```

**Transcoded:**

```http
GET /jellyfin/Videos/{itemId}/stream?transcode=true&container=mp4&quality=1080p
Authorization: Bearer <token>
```

**With Container Extension:**

```http
GET /jellyfin/Videos/{itemId}/stream.mp4?static=true
Authorization: Bearer <token>
```

Parameters:

- `static` - Force direct play (no transcoding)
- `transcode` - Force transcoding
- `container` - Target format (mp4, mkv, etc.)
- `quality` - Quality preset (1080p, 720p, etc.)
- `mediaSourceId` - Specific media source
- `playSessionId` - Playback session ID

## Item ID Format

Haas.Media uses structured IDs that encode entity type:

- **Library**: `library-{liteDbId}`
- **Movie**: `movie-{tmdbId}`
- **Series**: `series-{tmdbId}`
- **Season**: `season-{tmdbId}-{seasonNumber}`
- **Episode**: `episode-{tmdbId}-{season}-{episode}`

Example: `movie-603` for TMDb movie ID 603

## Typical Infuse Request Sequence

1. `GET /System/Info/Public` - Check server
2. `POST /Users/AuthenticateByName` - Login
3. `GET /Users/Me` - Get user info
4. `GET /Users/{userId}/Views` - Get libraries
5. `GET /Users/{userId}/Items/Latest` - Get recently added
6. `GET /Users/{userId}/Items?ParentId={libraryId}` - Browse library
7. `GET /Items/{itemId}` - Get item details
8. `GET /Items/{itemId}/Images/Primary` - Load poster
9. `GET /Items/{itemId}/PlaybackInfo` - Prepare playback
10. `GET /Videos/{itemId}/stream?static=true` - Stream video

## Common Query Parameters

### For Items Endpoints

- `ParentId` - Filter by parent (library, series, season)
- `IncludeItemTypes` - Comma-separated types (Movie,Series,Season,Episode)
- `Recursive` - Include all descendants (true/false)
- `SearchTerm` - Search query string
- `Limit` - Max results to return

### For Streaming

- `static` - Direct play without transcoding (true/false)
- `transcode` - Force transcoding (true/false)
- `container` - Target container format
- `quality` - Quality preset
- `mediaSourceId` - Specific media source ID
- `playSessionId` - Session tracking ID

### For Images

- `maxWidth` - Max width in pixels
- `quality` - Use "original" for full resolution

## Response Formats

All responses use JSON with camelCase property names.

### Item Response

```json
{
  "Id": "movie-603",
  "Name": "The Matrix",
  "Type": "Movie",
  "MediaType": "Video",
  "RunTimeTicks": 81480000000,
  "PremiereDate": "1999-03-31T00:00:00Z",
  "ProductionYear": 1999,
  "Overview": "...",
  "ImageTags": { "Primary": "..." },
  "MediaSources": [
    {
      "Id": "movie-603",
      "Path": "/Videos/The Matrix.mkv",
      "Container": "mkv",
      "SupportsDirectPlay": true,
      "MediaStreams": [...]
    }
  ]
}
```

## Debugging Tips

### Enable Request Logging

All Jellyfin endpoint responses are logged. Check API logs for:

```
Jellyfin response for {Endpoint}: {Response}
```

### Video Stream Logging

Stream requests log:

```
Video stream request: ItemId=..., Static=..., Transcode=..., Container=...
```

### Common Issues

**401 Unauthorized**: Check token is included and valid

**404 Not Found**: Verify item ID format and that content exists

**Empty Libraries**: Run metadata scan first

**No Playback**: Check file paths in `DATA_DIRECTORY` and ensure files exist

**Seeking Not Working**: Likely in transcoded mode; use `static=true` for direct play

## Environment Variables

Required in `.env`:

```bash
DATA_DIRECTORY=/path/to/media
JWT_SECRET=your-secret-key
JWT_ISSUER=haas-media
JWT_AUDIENCE=haas-media-api
```

Optional:

```bash
TMDB_API_KEY=your-tmdb-key  # For metadata
FFMPEG_BINARY=/usr/bin/ffmpeg  # For transcoding
```

## Additional Resources

- Full API Documentation: `/docs/backend/jellyfin-compatibility.md`
- Enhancement Summary: `/docs/backend/jellyfin-api-infuse-enhancements.md`
- OpenAPI Spec: `/docs/jellyfin-openapi-stable.json`
