# Metadata Scan Progress Improvements

## Overview

Enhanced the metadata scanning progress reporting to provide more detailed and accurate progress information during library scans.

## Changes Made

### Progress Tracking Enhancements

The scan progress now tracks and displays:

1. **Current file being processed** - Shows the actual filename or show title being scanned
2. **Processed files count** - Number of files processed so far
3. **Total files count** - Total number of media files to process
4. **Total people count** - Total number of cast/crew members discovered
5. **Synced people count** - Number of people successfully synced from TMDb
6. **Failed people count** - Number of people that failed to sync

### Smooth Progress Calculation

The progress bar now uses a weighted calculation:

- **70%** - Based on file processing progress
- **30%** - Based on people metadata sync progress

This provides a smoother, more accurate progress indication as both files and their associated people metadata are processed.

**Formula:**

```csharp
fileProgress = (processedFiles / totalFiles) * 70.0
peopleProgress = (syncedPeople / totalPeople) * 30.0
progress = fileProgress + peopleProgress
```

### Movie Library Scanning

**Key improvements:**

- Increments `TotalPeople` when movie credits are fetched (before syncing)
- Reports progress during person sync with real-time updates
- Updates `SyncedPeople` and `FailedPeople` counters during sync
- Displays current movie filename being processed

**Flow:**

1. Scan movie file
2. Fetch movie details from TMDb (including credits)
3. Count total cast/crew and add to `TotalPeople`
4. Sync each person with progress callbacks
5. Update UI in real-time as people are synced

### TV Show Library Scanning

**Key improvements:**

- Counts total people from show, season, and episode credits
- Reports total people count before syncing starts
- Provides real-time progress updates during person sync
- Displays current show title being processed

**Flow:**

1. Scan TV show directory
2. Fetch show details, seasons, and episodes from TMDb
3. Collect all unique person IDs from credits
4. Report total count via callback
5. Sync people with progress callbacks
6. Update UI in real-time

### Modified Methods

#### `ScanMovieLibraryWithProgressAsync`

- Removed local `peopleCountInMedia` and `peopleProcessed` variables
- Added people counts to payload state updates
- Simplified progress reporting with new `UpdateProgress()` helper
- Real-time progress during person sync

#### `ScanTVShowLibraryWithProgressAsync`

- Added `UpdateProgress()` helper function
- Updates state with people counts throughout processing
- Smooth progress calculation based on files and people

#### `CreateTVShowMetadata`

- Added optional callbacks:
  - `onTotalPeopleCountAvailable` - Called when total people count is known
  - `onPersonSyncProgress` - Called for each person sync event
- Allows parent method to track progress in real-time

## Benefits

1. **Better UX** - Users see exactly what file is being processed
2. **Accurate Progress** - Progress bar moves smoothly based on actual work
3. **Detailed Stats** - Users can see how many people are being synced
4. **Real-time Updates** - Progress updates during long-running person syncs
5. **Transparency** - Clear visibility into what the scanner is doing

## Example Payload

During a scan, the `ScanOperationInfo` payload now contains:

```json
{
  "id": "operation-id",
  "libraryPath": "Movies",
  "libraryTitle": "My Movies",
  "startTime": "2025-10-17T10:00:00Z",
  "currentFile": "The Matrix (1999).mkv",
  "totalFiles": 150,
  "processedFiles": 42,
  "foundMetadata": 41,
  "totalPeople": 1250,
  "syncedPeople": 843,
  "failedPeople": 7
}
```

## Frontend Integration

The frontend can now display:

- Progress bar: `(processedFiles/totalFiles * 70 + syncedPeople/totalPeople * 30)%`
- Current file: `currentFile`
- Files: `processedFiles / totalFiles`
- People: `syncedPeople / totalPeople` (or `syncedPeople + failedPeople / totalPeople`)
- Failed count: `failedPeople`
