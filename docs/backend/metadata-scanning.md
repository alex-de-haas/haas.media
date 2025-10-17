# Metadata Scanning Pipeline

`MetadataScanTaskExecutor` orchestrates background scans that reconcile on-disk media with LiteDB metadata. The executor is scheduled by `MetadataService.StartScanLibrariesAsync` and runs inside the shared background task infrastructure.

## Triggering a Scan

- Endpoint: `POST /api/metadata/scan/start?refreshExisting=true` (see [API.md](../API.md)).
- Returns an operation id (GUID). This id is echoed by SignalR events and in background task logs.
- `refreshExisting=false` skips TMDb lookups for files that already have metadata records, limiting the scan to new files and missing entries cleanup.

## Workflow Overview

1. Gather all libraries from LiteDB and ensure their directory exists under `DATA_DIRECTORY`.
2. For each library, gather candidate files via `Directory.GetFiles(..., SearchOption.AllDirectories)` using `FileHelper.IsMediaFile` to filter.
3. Track global totals (files, bytes) to drive progress reports.
4. For movie libraries, call `ScanMovieLibraryWithProgressAsync` which:
   - Iterates files, extracts a clean title using regex + heuristics (year, resolution, codecs, release groups, season/episode markers, etc.).
   - Queries TMDb for the best match and fetches full details when found.
   - Updates or inserts `MovieMetadata` (without file/library associations).
   - Creates `FileMetadata` records linking files to movie metadata via `MediaId`.
   - Broadcasts progress increments including files processed and matches found.
5. For TV libraries, `ScanTVShowLibraryAsync` walks multi-level folder structures, fetches TMDb show, season, and episode details:
   - Creates or updates `TVShowMetadata` with nested season/episode structures.
   - Creates `FileMetadata` records for each episode file with `SeasonNumber` and `EpisodeNumber`.
   - Supports multiple files per episode through separate `FileMetadata` entries.
6. After processing a library, stale file associations are removed via `ClearMissingMovieFiles`/`ClearMissingTvShowFiles`:
   - Deletes `FileMetadata` records for files that no longer exist on disk.
   - Preserves `MovieMetadata` and `TVShowMetadata` records even when files are missing.
7. When all libraries finish, the background task infrastructure transitions the task to `Completed`; operations remain available for auditing until the service restarts.

## ScanOperationInfo Contract

SignalR `TaskUpdated` events carry instances of:

```csharp
public record ScanOperationInfo(
    string Id,
    string LibraryPath,
    string LibraryTitle,
    int TotalFiles,
    int ProcessedFiles,
    int FoundMetadata,
    DateTime StartTime,
    string? CurrentFile = null
);
```

Progress, status, and error details are sourced from the associated `BackgroundTaskInfo` messages exposed through `/hub/background-tasks?type=MetadataScanTask`.

## Error Handling

- File system issues (missing directories, access denied) log warnings and continue with remaining libraries.
- TMDb errors log at warning level; the executor proceeds to the next candidate.
- Unhandled exceptions mark the scan as `Failed` and broadcast the failure status.
- Cancelling the background task via `TryCancel` (invoked when the host stops) sets the state to `Cancelled` before cleanup.

## Title Extraction Heuristics

The helper removes common noise tokens before searching TMDb:

- Year markers (`.2023.`, `(2019)`, `1999`)
- Resolution and format (`720p`, `1080p`, `2160p`, `UHD`, `4K`)
- Codec qualifiers (`x264`, `x265`, `h264`, `HEVC`)
- Quality tags (`BluRay`, `BDRemux`, `WEBRip`, `DVDRip`)
- Audio tags (`AAC`, `AC3`, `DTS`)
- Language markers (`.rus.`, `.eng.`)
- Release groups (`LostFilm`, `YTS`, etc.)
- Episodic markers (`S01E04`, `1x02`)

## Logging

- `Information`: lifecycle, per-library summary, completion totals.
- `Debug`: file-level processing details and TMDb queries.
- `Warning`: missing paths, TMDb misses, metadata conflicts.
- `Error`: unexpected exceptions before setting state to `Failed`.

## Related Documents

- [Metadata Domain](metadata.md) for storage specifics.
- [TMDb Throttling](tmdb-throttling.md) for retry configuration.
