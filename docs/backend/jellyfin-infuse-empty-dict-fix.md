# Jellyfin Infuse Views Endpoint Fix

## Issue

Infuse client was showing errors when calling:

```
GET /jellyfin/Users/{userId}/Views
```

First error: **"Unexpected server response. Please try again."**  
Second error: **"An error occurred"**

## Root Causes

### Issue 1: Empty Dictionaries

The `MapLibraryItemToFolder` method in `JellyfinService.cs` was setting `ImageTags` and `BackdropImageTags` to **empty dictionaries** (`new Dictionary<string, string>()`):

```json
{
  "ImageTags": {},
  "BackdropImageTags": {}
}
```

While this is technically valid JSON, some Jellyfin clients (particularly Infuse) expect these fields to either:
1. Be **omitted entirely** (via null values that get filtered by JSON serialization)
2. Contain actual image tag data

Empty dictionaries (`{}`) can cause parsing or validation issues in strict clients.

### Issue 2: Missing LocationType Field

After fixing the empty dictionaries, Infuse still showed an error because the `LocationType` field was missing. This field is commonly expected by Jellyfin clients to understand where content is stored.

### Issue 3: Incorrect MediaSources and UserData for Library Folders

After adding `LocationType`, Infuse still showed "An error occurred" because:
1. **MediaSources** was set to an empty array `[]` instead of `null` for library folders (folders don't have media sources)
2. **UserData** shouldn't be present on library folder items - it's only relevant for actual media content (movies, episodes) that can be played/watched, not for organizational folders

## Solutions

### Solution 1: Changed Empty Dictionaries to Null

Changed empty dictionary initialization to `null`:

```csharp
// Before
ImageTags = new Dictionary<string, string>(),
BackdropImageTags = new Dictionary<string, string>(),

// After
ImageTags = null,
BackdropImageTags = null,
```

With the existing JSON serialization configuration (`JsonIgnoreCondition.WhenWritingNull`), null values are omitted from the response.

### Solution 2: Added LocationType Field

Added `LocationType` property to `JellyfinItem` model and set it to `"FileSystem"` for library folders:

```csharp
// Added to JellyfinModels.cs
public string? LocationType { get; init; }

// Set in MapLibraryItemToFolder
LocationType = "FileSystem",
```

### Solution 3: Removed MediaSources and UserData from Library Folders

**MediaSources:** Changed from empty array to `null`:
```csharp
// Before
MediaSources = Array.Empty<JellyfinMediaSource>(),

// After
MediaSources = null,
```

**UserData:** Changed to `null` for library folders (only actual playable content should have UserData):
```csharp
// Before
UserData = new JellyfinUserData { Played = false },

// After
UserData = null,
```

Note: We also updated the `JellyfinUserData` model to use non-nullable fields with defaults (matching Jellyfin OpenAPI spec) for when UserData IS used on actual media items:
```csharp
public long PlaybackPositionTicks { get; init; } = 0;    // Was double?
public bool IsFavorite { get; init; } = false;            // Was bool?
public int PlayCount { get; init; } = 0;                  // Was int?
```

## Why This Works

1. **JSON Serialization Config**: The Jellyfin endpoints use `JsonIgnoreCondition.WhenWritingNull`, which means null fields are excluded from the response
2. **Consistency**: Other mapping methods (`MapMovieAsync`, `MapEpisodeAsync`) already correctly use `null` for empty image tags
3. **Helper Methods**: `BuildPrimaryImageTag()` and `BuildBackdropImageTag()` return `null` when no image path exists, not empty dictionaries
4. **Jellyfin Spec Compliance**: The official Jellyfin OpenAPI spec defines these fields as nullable, so omitting them is correct behavior

## Files Changed

- `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinModels.cs`
  - Added `LocationType` property to `JellyfinItem` record
  
- `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinService.cs`
  - Method: `MapLibraryItemToFolder()`
  - Changed `ImageTags` and `BackdropImageTags` from empty dictionaries to `null`
  - Added `LocationType = "FileSystem"` for library folders
  - Changed `MediaSources` from `Array.Empty<JellyfinMediaSource>()` to `null`
  - Changed `UserData` from `new JellyfinUserData { Played = false }` to `null`

## Testing

After all fixes, the `/jellyfin/Users/{userId}/Views` endpoint will return:

```json
{
  "Items": [
    {
      "Id": "library-68ee99bda3dc6813863d8550",
      "Name": "Movies",
      "OriginalTitle": "Movies",
      "SortName": "Movies",
      "Type": "CollectionFolder",
      "DisplayPreferencesId": "library-68ee99bda3dc6813863d8550",
      "CollectionType": "movies",
      "MediaType": "Folder",
      "IsFolder": true,
      "ServerId": "DFBC2078CD06B02E",
      "ChildCount": 1,
      "LocationType": "FileSystem"
    }
  ],
  "TotalRecordCount": 1,
  "StartIndex": 0
}
```

Key changes:
- `ImageTags` and `BackdropImageTags` are **omitted** (null, not empty objects)
- `LocationType` is set to `"FileSystem"`
- `MediaSources` is **omitted** (null, not empty array)
- `UserData` is **omitted** (library folders don't track watch status)

## Related Code Patterns

### Empty Collections

When creating Jellyfin response objects:

✅ **Do this** (use null for empty collections):
```csharp
ImageTags = null,
BackdropImageTags = null,
```

❌ **Don't do this** (empty dictionaries get serialized):
```csharp
ImageTags = new Dictionary<string, string>(),
BackdropImageTags = new Dictionary<string, string>(),
```

✅ **Or use helper methods** (they return null when appropriate):
```csharp
ImageTags = BuildPrimaryImageTag(metadata.PosterPath),
BackdropImageTags = BuildBackdropImageTag(metadata.BackdropPath),
```

### LocationType Values

Set `LocationType` based on item type:
- `"FileSystem"` - Library folders and local content
- `"Remote"` - Remote/network content
- `"Virtual"` - Virtual folders/collections
- `"Offline"` - Offline content

For standard library folders, always use `"FileSystem"`.
