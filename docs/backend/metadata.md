# Metadata Domain

The metadata service provides library management, TMDb search, and catalog storage. It is implemented by `MetadataService`, which is both an `IMetadataApi` and an `IHostedService` so it can schedule background scan tasks.

## Dependencies

- [TMDbLib](https://github.com/LordMike/TMDbLib) powers all TMDb queries. The client is configured with `DefaultLanguage = "en"` and runs through the custom throttled HTTP client described in [tmdb-throttling.md](tmdb-throttling.md).
- LiteDB stores libraries, movie metadata, and TV show metadata inside `common.db` under the `DATA_DIRECTORY` root.
- Progress updates stream through `/hub/background-tasks?type=MetadataScanTask`, which replays active scans on connect and pushes `TaskUpdated` payloads.

## Configuration

- `DATA_DIRECTORY` (required): used to resolve library roots and database location (`.db/common.db`).
- `TMDB_API_KEY` (required): bound to `TMDbClient`. The application fails fast during startup when missing.
- `Tmdb` options section: tunes retry and rate-limit behavior.

## Collections & Indexes

| Collection       | Purpose                               | Key Indexes                             |
| ---------------- | ------------------------------------- | --------------------------------------- |
| `libraries`      | Library definitions                   | `DirectoryPath` (unique), `Title`       |
| `movieMetadata`  | Movies synced from TMDb               | `TmdbId` (unique), `Title` |
| `tvShowMetadata` | TV shows with nested seasons/episodes | `TmdbId` (unique), `Title` |
| `fileMetadata`   | File-to-media associations (many-to-many) | `LibraryId`, `MediaId`, `FilePath`, `MediaType` |

Document identifiers are LiteDB `ObjectId` values stored as strings in API responses.

### File-Media Relationship

The system uses a **many-to-many relationship** between media items (movies/TV shows) and physical files through the `fileMetadata` collection. This allows:
- Multiple files per movie (e.g., Director's Cut, 4K version, theatrical version)
- Multiple files per TV episode (e.g., different quality versions)
- Flexible file associations managed independently from metadata

## Core Models

### LibraryInfo

```csharp
public class LibraryInfo
{
    public string? Id { get; set; }
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

`LibraryType` distinguishes movie (`1`) and TV show (`2`) collections. Directory paths are relative to `DATA_DIRECTORY`.

### MovieMetadata

```csharp
public class MovieMetadata
{
    public required int Id { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public DateTime? TheatricalReleaseDate { get; set; }
    public DateTime? DigitalReleaseDate { get; set; }
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public required string PosterPath { get; set; }
    public required string BackdropPath { get; set; }
    // Note: LibraryId and FilePath removed - now tracked via FileMetadata
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

### TVShowMetadata

```csharp
public class TVShowMetadata
{
    public required int Id { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public string[] Genres { get; set; } = [];
    public CrewMember[] Crew { get; set; } = [];
    public CastMember[] Cast { get; set; } = [];
    public Network[] Networks { get; set; } = [];
    public TVSeasonMetadata[] Seasons { get; set; } = [];
    public required string PosterPath { get; set; }
    public required string BackdropPath { get; set; }
    // Note: LibraryId removed - now tracked via FileMetadata
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

`TVSeasonMetadata` and `TVEpisodeMetadata` mirror TMDb data. File associations are now managed through `FileMetadata` records, allowing multiple files per episode.

### FileMetadata

```csharp
public class FileMetadata
{
    [BsonId]
    public string? Id { get; set; }
    public required string LibraryId { get; init; }
    public required string MediaId { get; init; }        // TMDb ID as string
    public required LibraryType MediaType { get; init; } // Movies or TVShows
    public required string FilePath { get; init; }
    public int? SeasonNumber { get; init; }              // For TV episodes only
    public int? EpisodeNumber { get; init; }             // For TV episodes only
    public required DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; set; }
}
```

This model enables many-to-many relationships between media items and files. For TV episodes, `SeasonNumber` and `EpisodeNumber` identify which specific episode the file belongs to.

### People & Networks

```csharp
public class CrewMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Job { get; set; }
    public required string Department { get; set; }
    public string? ProfilePath { get; set; }
}

public class CastMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Character { get; set; }
    public required int Order { get; set; }
    public string? ProfilePath { get; set; }
}

public class Network
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public string? LogoPath { get; set; }
    public string? OriginCountry { get; set; }
}
```

Manual mapping methods convert TMDb DTOs into these shapes while ignoring unwanted properties.

## Search Results

`SearchAsync` builds `SearchResult` objects for the UI:

```csharp
public class SearchResult
{
    public required int TmdbId { get; set; }
    public required string Title { get; set; }
    public required string OriginalTitle { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required LibraryType Type { get; set; }
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
}
```

`LibraryType` is inferred from the TMDb result type so the client can pre-select a compatible library.

## Library & Catalog Operations

See [API.md](../API.md) for endpoint shapes. Service-level behavior includes:

- Validating IDs loaded from LiteDB and logging misses.
- Maintaining `CreatedAt`/`UpdatedAt` timestamps whenever documents change.
- Enforcing unique TMDb ids across collections (`EnsureIndex`). Duplicate inserts surface as `InvalidOperationException` and return `409 Conflict` to clients.
- `DeleteMovieMetadataAsync` and `DeleteTVShowMetadataAsync` remove documents by LiteDB id without touching on-disk media. **These methods automatically queue a background task to clean up orphaned person metadata** by checking if cast/crew members are still referenced by any other movies or TV shows. The cleanup runs asynchronously without blocking the delete operation. See [person-metadata-cleanup.md](person-metadata-cleanup.md) for details.
- `StartRefreshMetadataAsync` enqueues a background task that re-fetches movie and TV metadata from TMDb. The API endpoint `POST /api/metadata/refresh/start` returns the operation id; progress streams through the background task hub with payloads of type `MetadataRefreshOperationInfo`.

## Add-to-Library Workflow

`AddToLibraryAsync` bridges TMDb and LiteDB:

1. Validate that the target library exists and matches the requested `LibraryType`.
2. Fetch the movie or TV show from TMDb using `TMDbClient` plus additional detail calls (credits, seasons).
3. Project the TMDb payload into the LiteDB model, populating cast, crew, networks, and (for TV) full season structures.
4. Persist the document and return it to the caller.

Example payload:

```json
{
  "type": 1,
  "libraryId": "6623f1fbe6dcab9395080a5c",
  "tmdbId": "550"
}
```

The request accepts `tmdbId` as a string (mirroring TMDb identifiers returned to the UI) and parses it to an integer before inserting into LiteDB.

Failures:

- Invalid library id → `ArgumentException` → `400 Bad Request` with message.
- Type mismatch or existing record → `InvalidOperationException` → `409 Conflict`.

## Image Helpers

`MetadataService` exposes helper methods and extension methods that transform TMDb relative paths into full URLs (poster: `w500`, backdrop: `w1280`). Prefer these helpers to keep URL formatting consistent.

## Background Scans

The `MetadataScanTaskExecutor` is responsible for filesystem scans and TMDb lookups. Details live in [metadata-scanning.md](metadata-scanning.md).

## Metadata Refresh

Use `POST /api/metadata/refresh/start` to refresh all stored movie and TV show entries against TMDb without touching the filesystem. The task walks existing LiteDB documents, updates credits, artwork, networks, and season/episode structures, and preserves any file associations captured during scans. Progress updates are available via the background task hub under the `MetadataRefreshTask` type.

## Security

All metadata operations honour JWT authentication. The background task hub reuses the same bearer tokens (via query string when necessary).
