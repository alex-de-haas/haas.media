# Jellyfin API Endpoint Map

Visual reference of all Jellyfin endpoints implemented in Haas.Media.

## Authentication & System
```
┌─────────────────────────────────────────────────────────────┐
│ 🔓 ANONYMOUS (No Auth Required)                             │
├─────────────────────────────────────────────────────────────┤
│ POST   /jellyfin/Users/AuthenticateByName                   │
│ GET    /jellyfin/System/Info/Public                         │
│ GET    /jellyfin/System/Ping                                │
│ GET    /jellyfin/Users/Public                               │
│ GET    /jellyfin/Branding/Configuration                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🔒 AUTHENTICATED                                             │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/System/Info                                │
└─────────────────────────────────────────────────────────────┘
```

## User Management
```
┌─────────────────────────────────────────────────────────────┐
│ 🔒 USER ENDPOINTS (Authenticated)                            │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Users                                      │
│ GET    /jellyfin/Users/Me                                   │
│ GET    /jellyfin/Users/{userId}                             │
│ GET    /jellyfin/Users/{userId}/Views                       │
│ GET    /jellyfin/Sessions                                   │
└─────────────────────────────────────────────────────────────┘
```

## Library & Content
```
┌─────────────────────────────────────────────────────────────┐
│ 📚 LIBRARY ENDPOINTS                                         │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Library/MediaFolders                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🎬 ITEMS ENDPOINTS                                           │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Items                                      │
│ GET    /jellyfin/Items/{itemId}                             │
│ GET    /jellyfin/Users/{userId}/Items                       │
│ GET    /jellyfin/Users/{userId}/Items/Latest         ⭐ NEW │
│ GET    /jellyfin/Users/{userId}/Items/Resume         ⭐ NEW │
└─────────────────────────────────────────────────────────────┘
```

## TV Shows
```
┌─────────────────────────────────────────────────────────────┐
│ 📺 TV SHOW ENDPOINTS                                         │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Shows/{seriesId}/Seasons                   │
│        Query: ?userId={userId}                              │
│        Returns: Seasons with files (filtered)               │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Shows/{seriesId}/Episodes           ⭐ NEW │
│        Query: ?userId={userId}&seasonId={seasonId}          │
│        Returns: All episodes or season-specific episodes    │
│        Note: Filters out episodes without files             │
└─────────────────────────────────────────────────────────────┘
```

## Images
```
┌─────────────────────────────────────────────────────────────┐
│ 🖼️  IMAGE ENDPOINTS                                          │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Items/{itemId}/Images/{type}               │
│        Types: Primary, Backdrop                             │
│        Query: ?maxWidth=780 or ?quality=original            │
└─────────────────────────────────────────────────────────────┘
```

## Playback
```
┌─────────────────────────────────────────────────────────────┐
│ ▶️  PLAYBACK ENDPOINTS                                       │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Items/{itemId}/PlaybackInfo         ⭐ NEW │
│ POST   /jellyfin/Items/{itemId}/PlaybackInfo               │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Videos/{itemId}/stream                     │
│        Query: ?static=true (direct play)                    │
│        Query: ?transcode=true&container=mp4                 │
│        Query: ?quality=1080p                                │
├─────────────────────────────────────────────────────────────┤
│ GET    /jellyfin/Videos/{itemId}/stream.{container}  ⭐ NEW │
│        Example: /Videos/movie-603/stream.mp4               │
└─────────────────────────────────────────────────────────────┘
```

## Request Flow Examples

### Initial Connection
```
Client                                  Server
  │                                       │
  ├─GET /System/Info/Public──────────────>│
  │<─────────────────────── 200 OK────────┤
  │                                       │
  ├─GET /Users/Public─────────────────────>│
  │<─────────────────────── 200 OK────────┤
  │                                       │
  ├─POST /Users/AuthenticateByName────────>│
  │  { "Username": "...", "Password": "..." }
  │<─────────────────────── 200 OK────────┤
  │  { "AccessToken": "...", "User": {...} }
  │                                       │
```

### Browse Library
```
Client                                  Server
  │                                       │
  ├─GET /Users/Me ───────────────────────>│
  │  Authorization: Bearer <token>        │
  │<─────────────────────── 200 OK────────┤
  │                                       │
  ├─GET /Users/{userId}/Views ───────────>│
  │<─────────────────────── 200 OK────────┤
  │  { "Items": [{"Id": "library-123", ...}] }
  │                                       │
  ├─GET /Users/{userId}/Items ───────────>│
  │  ?ParentId=library-123&Recursive=true │
  │<─────────────────────── 200 OK────────┤
  │  { "Items": [...], "TotalRecordCount": 42 }
  │                                       │
```

### Play Video
```
Client                                  Server
  │                                       │
  ├─GET /Items/{itemId} ─────────────────>│
  │<─────────────────────── 200 OK────────┤
  │  { "Id": "movie-603", "MediaSources": [...] }
  │                                       │
  ├─GET /Items/{itemId}/Images/Primary ──>│
  │<─────────────────────── 302 Redirect──┤
  │  Location: https://image.tmdb.org/... │
  │                                       │
  ├─GET /Items/{itemId}/PlaybackInfo ────>│
  │<─────────────────────── 200 OK────────┤
  │  { "MediaSources": [...], "PlaySessionId": "..." }
  │                                       │
  ├─GET /Videos/{itemId}/stream ─────────>│
  │  ?static=true                         │
  │<─────────────────────── 200 OK────────┤
  │  [video stream data...]               │
  │                                       │
```

## Query Parameter Quick Reference

### Items Endpoints
| Parameter | Values | Description |
|-----------|--------|-------------|
| `ParentId` | ID string | Filter by parent (library/series/season) |
| `IncludeItemTypes` | Movie,Series,Season,Episode | Comma-separated types |
| `Recursive` | true/false | Include all descendants |
| `SearchTerm` | String | Search query |
| `Limit` | Number | Max results |

### TV Shows Endpoints
| Parameter | Values | Description |
|-----------|--------|-------------|
| `userId` | User ID | User context for playback info |
| `seasonId` | Season ID | Filter episodes by season (e.g., season-95480-1) |
| `excludeLocationTypes` | Virtual | Exclude virtual/placeholder items |
| `fields` | Comma-separated | Additional fields (e.g., PrimaryImageAspectRatio) |

### Streaming Endpoints
| Parameter | Values | Description |
|-----------|--------|-------------|
| `static` | true/false | Force direct play |
| `transcode` | true/false | Force transcoding |
| `container` | mp4,mkv,webm,etc | Target format |
| `quality` | 1080p,720p,etc | Quality preset |
| `mediaSourceId` | ID string | Specific media source |
| `playSessionId` | ID string | Session tracking |

### Image Endpoints
| Parameter | Values | Description |
|-----------|--------|-------------|
| `maxWidth` | Number | Max width in pixels |
| `quality` | original | Use full resolution |

## Response Codes

| Code | Meaning | Common Causes |
|------|---------|---------------|
| 200 | OK | Successful request |
| 302 | Redirect | Image proxy to TMDb |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | User doesn't own resource |
| 404 | Not Found | Item doesn't exist |
| 503 | Service Unavailable | Server starting up |

## Item ID Patterns

```
┌──────────────────────────────────────────────────────────┐
│ ID Format                        Example                 │
├──────────────────────────────────────────────────────────┤
│ library-{liteDbId}               library-6623f1fbe6d...  │
│ movie-{tmdbId}                   movie-603               │
│ series-{tmdbId}                  series-1399             │
│ season-{tmdbId}-{seasonNum}      season-1399-1           │
│ episode-{tmdbId}-{s}-{e}         episode-1399-1-1        │
└──────────────────────────────────────────────────────────┘
```

## Token Authentication Methods

```
┌──────────────────────────────────────────────────────────┐
│ Method                           Example                  │
├──────────────────────────────────────────────────────────┤
│ Authorization header             Bearer eyJhbGc...       │
│ X-Emby-Token header              eyJhbGc...              │
│ X-MediaBrowser-Token header      eyJhbGc...              │
│ Query parameter                  ?api_key=eyJhbGc...     │
│ X-Emby-Authorization header      MediaBrowser Token="..."│
└──────────────────────────────────────────────────────────┘
```

## Legend

⭐ NEW - Newly added endpoint  
🔓 - No authentication required  
🔒 - Authentication required  
📚 - Library operations  
🎬 - Content operations  
� - TV show operations  
�🖼️ - Image operations  
▶️ - Playback operations

---

**Total Endpoints:** 25  
**New in This Update:** 6  
**Enhanced:** 3  
**Jellyfin Spec Version:** 10.11.0
