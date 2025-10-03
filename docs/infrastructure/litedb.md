# LiteDB Integration

The downloader API embeds [LiteDB](https://www.litedb.org/) for lightweight persistence. No external service is required; all data lives in a single file under the media root.

## File Layout

- `DATA_DIRECTORY` — required configuration value. The API creates the folder if absent.
- Database path: `${DATA_DIRECTORY}/.db/common.db`.
- Keys for ASP.NET Data Protection are stored alongside the database in `${DATA_DIRECTORY}/.keys` (see `Program.cs`).

Example:

```env
DATA_DIRECTORY=/mnt/media
```

## Registration

```csharp
var databaseDirectory = Path.Combine(dataDirectory, ".db");
Directory.CreateDirectory(databaseDirectory);
var databasePath = Path.Combine(databaseDirectory, "common.db");
services.AddSingleton(_ => new LiteDatabase($"Filename={databasePath};Connection=shared;"));
```

`Connection=shared` enables multi-threaded usage which suits hosting inside ASP.NET.

## Collections & Indexes

`MetadataService` lazy-creates collections and ensures indexes on startup.

| Collection       | Indexes                                 |
| ---------------- | --------------------------------------- |
| `libraries`      | `DirectoryPath` (unique), `Title`       |
| `movieMetadata`  | `LibraryId`, `TmdbId` (unique), `Title` |
| `tvShowMetadata` | `LibraryId`, `TmdbId` (unique), `Title` |

`TmdbId` uniqueness prevents duplicate imports. Missing file clean-up happens during metadata scans.

## Identifiers & Timestamps

- LiteDB `ObjectId` values are stored as strings (`LibraryInfo.Id`, `MovieMetadata.Id`, etc.).
- `AddLibraryAsync` generates IDs via `ObjectId.NewObjectId().ToString()` and stamps both `CreatedAt` and `UpdatedAt`.
- Update operations overwrite `UpdatedAt` with `DateTime.UtcNow`.

## Threading Model

LiteDB APIs are synchronous. `MetadataService` exposes async methods that return completed `Task`s for reads or wrap synchronous work inside `Task.FromResult`. Background operations (scans, add-to-library) still execute synchronously against the shared connection but run on worker threads provided by the background task infrastructure.

## Maintenance

- Back up the metadata by copying `common.db` while the service is stopped.
- Deleting the file resets metadata; the application recreates it on next start.
- Collections compact automatically; for manual compaction use LiteDB Studio with the same connection string.

## Related Notes

- See [metadata.md](../backend/metadata.md) for the domain model stored in LiteDB.
- The background scan pipeline handles orphan cleanup and ensures database consistency with on-disk media.
