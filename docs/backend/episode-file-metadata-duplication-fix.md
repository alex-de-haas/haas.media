# Episode File Metadata Duplication Fix

**Date:** October 29, 2025  
**Issue:** Every metadata sync duplicated `FileMetadata` records for TV show episodes  
**Status:** ✅ Fixed

## Problem Description

During metadata sync operations, `FileMetadata` records for TV show episodes were being duplicated with each sync run. This occurred because:

1. **Detection of new files:** When new TV episode files were added to an existing show, the sync process would detect them during the file scanning phase
2. **Show-level processing:** The sync logic processes TV shows at the directory level (not individual files)
3. **No existence check:** When processing a show directory, the code would create `FileMetadata` records for **ALL episodes** in the show without checking if they already existed
4. **Repeated on every sync:** Each time a sync ran (even with no new files), the entire show would be re-processed if the system thought there were changes

### Root Cause

In `MetadataSyncTaskExecutor.ProcessNewTvShowDirectoryAsync()`:

```csharp
// OLD CODE - No duplicate check
if (filePath != null)
{
    var relativePath = Path.GetRelativePath(_dataPath, filePath);
    var fileMetadata = new FileMetadata { /* ... */ };
    _fileMetadataCollection.Insert(fileMetadata); // ❌ Always inserts
}
```

## Solution

### 1. Added Duplicate Check in ProcessNewTvShowDirectoryAsync

Added a check before inserting file metadata to prevent duplicates:

```csharp
if (filePath != null)
{
    var relativePath = Path.GetRelativePath(_dataPath, filePath);
    
    // Check if file metadata already exists
    var existingFileMetadata = _fileMetadataCollection.FindOne(f =>
        f.FilePath == relativePath &&
        f.TmdbId == searchResults.Id &&
        f.SeasonNumber == season.SeasonNumber &&
        f.EpisodeNumber == episode.EpisodeNumber
    );

    if (existingFileMetadata == null)
    {
        var fileMetadata = new FileMetadata { /* ... */ };
        _fileMetadataCollection.Insert(fileMetadata); // ✅ Only insert if new
    }
}
```

**File:** `src/Haas.Media.Services/Metadata/MetadataSyncTaskExecutor.cs:763-789`

### 2. Added ProcessNewEpisodeFilesForExistingShowAsync Method

Created a new method specifically for handling new episode files for existing shows:

```csharp
private async Task ProcessNewEpisodeFilesForExistingShowAsync(
    string showDirectory,
    TVShowMetadata existingShow,
    CancellationToken cancellationToken
)
{
    // Scans directory for episode files
    // Extracts season/episode numbers from filenames (S01E01 pattern)
    // Checks for existing FileMetadata before inserting
    // Logs each new file added
}
```

**File:** `src/Haas.Media.Services/Metadata/MetadataSyncTaskExecutor.cs:849-925`

### 3. Enhanced Show Directory Processing Logic

Modified the sync logic to handle both new shows AND new episodes for existing shows:

```csharp
// Check if show already exists
var existingShow = _tvShowMetadataCollection.FindOne(tv => tv.Title == showTitle);

if (existingShow == null)
{
    // Process as new show
    await ProcessNewTvShowDirectoryAsync(/* ... */);
}
else if (showDirectoriesWithNewFiles.Contains(showDirectory))
{
    // Existing show with new files - add file metadata only
    await ProcessNewEpisodeFilesForExistingShowAsync(
        showDirectory,
        existingShow,
        cancellationToken
    );
}
```

**File:** `src/Haas.Media.Services/Metadata/MetadataSyncTaskExecutor.cs:287-342`

### 4. Added Cleanup API Endpoint

Created an API endpoint to clean up existing duplicates:

**Endpoint:** `POST /api/metadata/files/cleanup-duplicates`

**Implementation:**
- Groups all `FileMetadata` records by unique identifier (TmdbId, FilePath, SeasonNumber, EpisodeNumber)
- Identifies groups with duplicates (count > 1)
- Keeps the oldest record (by `CreatedAt`), deletes the rest
- Returns count of deleted duplicates

**Files:**
- Service method: `src/Haas.Media.Services/Metadata/MetadataService.cs:586-636`
- Interface: `src/Haas.Media.Services/Metadata/IMetadataApi.cs:31`
- Endpoint: `src/Haas.Media.Services/Metadata/MetadataConfiguration.cs:239-248`

## Usage

### Cleaning Up Existing Duplicates

To remove existing duplicate file metadata records:

```bash
curl -X POST http://localhost:8000/api/metadata/files/cleanup-duplicates \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "deletedCount": 42,
  "message": "Cleaned up 42 duplicate file metadata record(s)"
}
```

### Verification

After cleanup, verify in the UI:
1. Navigate to a TV show details page
2. Expand a season
3. Check episode file paths - should see only one path per episode file

## Prevention

With the fix in place, the system now:

✅ Checks for existing `FileMetadata` before inserting  
✅ Handles new episodes for existing shows without re-processing all episodes  
✅ Uses separate logic for new shows vs. new episodes  
✅ Logs when new episode files are added for existing shows

## Impact

- **Before:** Every sync created N duplicate `FileMetadata` records for each TV show
- **After:** Each file has exactly one `FileMetadata` record
- **Performance:** Reduced database bloat, faster queries for episode file lookups
- **UI:** Episode details pages no longer show duplicate file paths

## Technical Details

### FileMetadata Model

```csharp
public class FileMetadata
{
    [BsonId]
    public required string Id { get; set; }
    public required int TmdbId { get; init; }
    public required LibraryType LibraryType { get; init; }
    public required string FilePath { get; set; }
    public int? SeasonNumber { get; init; }  // For TV episodes
    public int? EpisodeNumber { get; init; } // For TV episodes
    public required DateTime CreatedAt { get; init; }
    // ... other fields
}
```

**Unique constraint:** Combination of `TmdbId`, `FilePath`, `SeasonNumber`, and `EpisodeNumber`

### Episode File Pattern Matching

The new `ProcessNewEpisodeFilesForExistingShowAsync` method uses regex to extract episode info:

```csharp
var match = Regex.Match(fileName, @"S(\d{2})E(\d{2})", RegexOptions.IgnoreCase);
// Matches: S01E01, s02e15, S03E99, etc.
```

## Related Files

- `src/Haas.Media.Services/Metadata/MetadataSyncTaskExecutor.cs` - Main sync logic
- `src/Haas.Media.Services/Metadata/MetadataService.cs` - Cleanup method
- `src/Haas.Media.Services/Metadata/IMetadataApi.cs` - Interface definition
- `src/Haas.Media.Services/Metadata/MetadataConfiguration.cs` - API endpoint registration
- `src/Haas.Media.Services/Metadata/Models/FileMetadata.cs` - Data model

## Future Improvements

Consider:
1. Adding a database index on `(TmdbId, FilePath, SeasonNumber, EpisodeNumber)` for faster duplicate checks
2. Creating a background task to periodically scan for and clean up duplicates
3. Adding metrics/telemetry to track when duplicates are prevented
