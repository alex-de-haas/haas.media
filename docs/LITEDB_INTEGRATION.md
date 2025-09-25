# LiteDB Integration

The Haas.Media downloader API uses [LiteDB](https://www.litedb.org/) as an embedded document database to persist library definitions and media metadata. LiteDB stores all data in a single file and does not require any external services or containers.

## Database Location

- The database file is created under the configured `DATA_DIRECTORY`.
- File name: `metadata.db`
- The application ensures the directory exists during startup.

Example environment configuration:

```env
DATA_DIRECTORY=/path/to/media/data
```

## Initialization

`Program.cs` registers a singleton `LiteDatabase` using the connection string `Filename={DATA_DIRECTORY}/metadata.db;Connection=shared;`. The `Connection=shared` option allows multi-threaded access from the ASP.NET host.

## Collections

LiteDB collections are created on demand by `MetadataService`:

- `libraries` – stores `LibraryInfo` documents
- `movieMetadata` – stores `MovieMetadata` documents
- `tvShowMetadata` – stores `TVShowMetadata` documents

Indexes are created when the service starts:

- `libraries`
  - `DirectoryPath` (unique)
  - `Title`
- `movieMetadata`
  - `FilePath` (unique)
  - `LibraryId`
  - `TmdbId`
  - `Title`
- `tvShowMetadata`
  - `LibraryId`
  - `TmdbId`
  - `Title`

## ID Handling

- Documents use the LiteDB `ObjectId` type represented as strings in the API models.
- New IDs are generated with `ObjectId.NewObjectId().ToString()` before inserting records.
- The API validates IDs by checking for empty values; LiteDB returns `null` when an ID is not found.

## Threading Considerations

LiteDB operations are synchronous. The metadata service wraps them in asynchronous method signatures to keep the public API unchanged, while internal calls execute synchronously on the shared `LiteDatabase` instance.

## Backup & Maintenance

Because LiteDB stores everything in a single file, backing up metadata simply requires copying `metadata.db`. To reset the database, stop the application and delete the file; it will be recreated on the next start.
