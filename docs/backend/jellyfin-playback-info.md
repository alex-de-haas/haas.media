# Jellyfin Playback Information Support

This document describes the playback information tracking feature for Jellyfin compatibility.

## Overview

The system now stores and tracks playback information for files on a per-user basis, including:
- Playback position (in ticks, compatible with Jellyfin)
- Play count
- Played/watched status
- Favorite status
- Last played date

This information integrates with Jellyfin clients (like Infuse) to provide resume functionality and track viewing progress.

## Database Schema

### FilePlaybackInfo Collection

Stored in LiteDB at `{DATA_DIRECTORY}/.db/common.db` in the `filePlaybackInfo` collection.

**Fields:**
- `Id` (string): Composite key `{UserId}_{FileMetadataId}`
- `UserId` (string): User ID from authentication system
- `FileMetadataId` (string): Reference to FileMetadata.Id
- `PlaybackPositionTicks` (long): Current position in 100-nanosecond units
- `PlayCount` (int): Number of times file has been played
- `Played` (bool): Whether file is marked as watched
- `IsFavorite` (bool): Whether file is marked as favorite
- `LastPlayedDate` (DateTime?): Last time file was played
- `CreatedAt` (DateTime): Record creation timestamp
- `UpdatedAt` (DateTime): Last update timestamp

**Indexes:**
- `UserId` - For querying all playback info for a user
- `FileMetadataId` - For querying playback info for a specific file
- Compound `(UserId, FileMetadataId)` - For fast lookups

## API Endpoints

### Playback Progress Tracking

#### Start Playback
```
POST /jellyfin/Sessions/Playing
```
Notifies the server that playback has started. Updates `LastPlayedDate`.

#### Report Progress
```
POST /jellyfin/Sessions/Playing/Progress
```
Updates playback position during playback. Clients typically call this every few seconds.

#### Stop Playback
```
POST /jellyfin/Sessions/Playing/Stopped
```
Called when playback stops. Increments play count if stopped with progress.

**Request Body (all endpoints):**
```json
{
  "ItemId": "movie-12345" or "episode-67890-1-2",
  "PositionTicks": 36000000000,
  "IsPaused": false,
  "SessionId": "session-guid",
  "MediaSourceId": "source-id"
}
```

### Manual Played Status

#### Mark as Played
```
POST /jellyfin/Users/{userId}/PlayedItems/{itemId}
```
Manually marks an item as watched. Resets position to 0.

**Optional Request Body:**
```json
{
  "DatePlayed": "2025-10-21T12:00:00Z"
}
```

#### Mark as Unplayed
```
DELETE /jellyfin/Users/{userId}/PlayedItems/{itemId}
```
Marks an item as unwatched. Resets position and play count to 0.

## Service Layer

### MetadataService Methods

```csharp
Task<FilePlaybackInfo?> GetPlaybackInfoAsync(string userId, string fileMetadataId)
Task<FilePlaybackInfo> SavePlaybackInfoAsync(FilePlaybackInfo playbackInfo)
Task<bool> DeletePlaybackInfoAsync(string userId, string fileMetadataId)
Task<IEnumerable<FilePlaybackInfo>> GetUserPlaybackInfoAsync(string userId)
```

### JellyfinService Integration

Movie and episode items now include `UserData` populated from playback info when `userId` is provided:

```csharp
public async Task<JellyfinItem?> GetItemByIdAsync(
    string itemId, 
    string? userId = null,
    CancellationToken cancellationToken = default)
```

**UserData Structure:**
```csharp
public sealed record JellyfinUserData
{
    public bool Played { get; init; }
    public long PlaybackPositionTicks { get; init; } = 0;
    public double? PlayedPercentage { get; init; }
    public bool IsFavorite { get; init; } = false;
    public int PlayCount { get; init; } = 0;
    public int? UnplayedItemCount { get; init; }
}
```

## Item ID Resolution

The system maps Jellyfin item IDs to FileMetadata IDs:

- **Movies**: `movie-{tmdbId}` → First file for that movie
- **Episodes**: `episode-{seriesId}-{seasonNum}-{episodeNum}` → File with matching season/episode

This mapping is handled by `ResolveFileMetadataId()` in `JellyfinConfiguration.cs`.

## Client Behavior

### Infuse (iOS/Apple TV)
- Sends progress updates every 5-10 seconds during playback
- Sends stop event when user exits or video ends
- Reads `PlaybackPositionTicks` to resume from last position
- Uses `Played` status to mark watched items

### Expected Workflow
1. Client requests item via `/Users/{userId}/Items/{itemId}`
2. Response includes `UserData.PlaybackPositionTicks` with saved position
3. Client starts playback at saved position (or from beginning if 0)
4. Client sends progress updates to `/Sessions/Playing/Progress`
5. Client sends stop event to `/Sessions/Playing/Stopped`
6. Next request shows updated position/play count

## Playback Heuristics

### Auto-Mark as Played
Currently, the system increments play count when playback is stopped with position > 0.

**Future Enhancement:** Mark as played automatically when position is within last 10% of runtime:
```csharp
var runtimeTicks = GetRuntimeTicks(fileMetadata);
var percentWatched = (double)stopInfo.PositionTicks / runtimeTicks;
if (percentWatched >= 0.9) 
{
    playbackInfo.Played = true;
}
```

### Resume Position Reset
Manually marking as played resets `PlaybackPositionTicks` to 0, allowing re-watch from beginning.

## Testing

### Manual Testing with curl

**Report playback progress:**
```bash
curl -X POST http://localhost:8000/jellyfin/Sessions/Playing/Progress \
  -H "Authorization: Bearer $JELLYFIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ItemId": "movie-12345",
    "PositionTicks": 36000000000,
    "IsPaused": false
  }'
```

**Mark as played:**
```bash
curl -X POST http://localhost:8000/jellyfin/Users/$USER_ID/PlayedItems/movie-12345 \
  -H "Authorization: Bearer $JELLYFIN_TOKEN"
```

**Check item with user data:**
```bash
curl http://localhost:8000/jellyfin/Users/$USER_ID/Items/movie-12345 \
  -H "Authorization: Bearer $JELLYFIN_TOKEN"
```

## Future Enhancements

1. **PlayedPercentage Calculation**: Requires storing runtime in FileMetadata or calculating from media files
2. **Bulk Operations**: Mark entire seasons/series as played
3. **Sync Across Devices**: Already supported via shared database
4. **Playback Sessions**: Track active playback sessions for simultaneous multi-device playback
5. **Statistics**: Most watched items, watch time analytics per user
6. **Cleanup**: Remove old playback records for deleted files (add to file deletion logic)

## Database Maintenance

Playback records persist indefinitely. To clean up records for deleted files:

```sql
-- LiteDB query to find orphaned records
db.filePlaybackInfo.find(p => !db.fileMetadata.exists(f => f._id == p.FileMetadataId))
```

Consider adding cleanup logic to file deletion in `MetadataService.DeleteFileMetadataAsync()`.
