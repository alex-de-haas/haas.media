# Backend API Reference

The Haas.Media backend exposes REST endpoints grouped by domain. Every endpoint requires a valid Auth0 bearer token unless noted otherwise. SignalR hubs mirror long-running or event-driven operations.

## Authentication & Conventions
- Base URL: depends on deployment; use `http://localhost:8000` when running locally.
- Authentication: Auth0 JWT via `Authorization: Bearer <token>` header. WebSocket connections append `?access_token=` query parameter.
- Success responses follow standard HTTP codes (`200 OK`, `201 Created`, etc.). Validation failures return `400 Bad Request` with a JSON `message` field; conflicts return `409 Conflict`.

## Torrent Management
- `POST /api/torrents/upload` — multipart form upload for one or more `.torrent` files. Returns `uploaded`, `failed`, and per-file errors.
- `GET /api/torrents` — fetch all known torrents with progress and state metadata.
- `POST /api/torrents/{hash}/start` — queue or resume a torrent by info hash.
- `POST /api/torrents/{hash}/pause` — pause an active torrent without removing data.
- `POST /api/torrents/{hash}/stop` — fully stop the torrent session.
- `DELETE /api/torrents/{hash}?deleteData=false` — remove torrent; set `deleteData=true` to delete downloaded files.
- SignalR: `/hub/torrents` sends torrent status updates in real time.

## Encoding Service
- `GET /api/encodings` — list active encoding jobs. Response includes job id, status, target files, and configured codecs.
- `GET /api/encodings/info?path=<relative-or-absolute>` — inspect a directory or media file and return detected streams.
- `POST /api/encodings` — start an encode job. Body follows `EncodeRequest` (source path, destination path, selected streams, codecs, optional hardware acceleration hints).
- `DELETE /api/encodings/{id}` — stop a running job and remove it from the queue.
- SignalR: `/hub/encodings` broadcasts job state transitions and progress percentage.

## File Management
All file system paths are rooted at the configured `DATA_DIRECTORY`; the service rejects traversal attempts.

- `GET /api/files?path=<relative>` — list files and directories. Returns `FileItem[]` with metadata and optional `MediaInfo` for media files.
- `GET /api/files/copy-operations` — inspect background copy/move operations.
- `POST /api/files/copy` — enqueue a copy. Body: `{ "sourcePath": "...", "destinationPath": "..." }`. Response contains `OperationId`.
- `DELETE /api/files/copy-operations/{operationId}` — cancel a pending or running copy job.
- `POST /api/files/move` — synchronous move/rename between two relative paths.
- `PUT /api/files/rename` — rename a single item inside its directory. Body: `{ "path": "media/video.mp4", "newName": "video-final.mp4" }`.
- `POST /api/files/directory` — create a directory tree relative to the root.
- `DELETE /api/files?path=<relative>` — delete a single file.
- `DELETE /api/files/directory?path=<relative>` — delete a directory and contents.
- SignalR: `/hub/files` shares copy operation lifecycle events.

## Metadata Libraries & Catalog
Metadata is stored in LiteDB collections inside `common.db`. Responses include LiteDB string IDs.

### Libraries
- `GET /api/metadata/libraries` — list libraries with type, root path, and timestamps.
- `GET /api/metadata/libraries/{id}` — retrieve a single library.
- `POST /api/metadata/libraries` — create a library. Body: `{ "type": 1, "directoryPath": "Movies", "title": "Movies", "description": "Optional" }`.
- `PUT /api/metadata/libraries/{id}` — update metadata for an existing library.
- `DELETE /api/metadata/libraries/{id}` — remove a library definition. Stored metadata is not automatically purged.

### Metadata Catalog
- `GET /api/metadata/movies?libraryId=<optional>` — list movie metadata. Includes cast and crew arrays.
- `GET /api/metadata/movies/{id}` — fetch a single movie record.
- `DELETE /api/metadata/movies/{id}` — delete a movie metadata record.
- `GET /api/metadata/tvshows?libraryId=<optional>` — list TV show metadata with nested season/episode information.
- `GET /api/metadata/tvshows/{id}` — fetch a single TV show record.
- `DELETE /api/metadata/tvshows/{id}` — delete a TV show metadata record.

### Discovery & Library Population
- `POST /api/metadata/scan/start?refreshExisting=true` — launch a background scan over all libraries. Set `refreshExisting=false` to skip files that already have metadata. Returns `{ "operationId": "<guid>" }`.
- `GET /api/metadata/search?query=<term>&libraryType=<1|2>` — proxy TMDb search. Returns `SearchResult[]` containing TMDb id, type, title, rating, and poster paths.
- `POST /api/metadata/add-to-library` — materialize TMDb data inside LiteDB. Example body:
  ```json
  {
    "type": 1,
    "libraryId": "658f2ab9c6e2f3c47b1f9a88",
    "tmdbId": "550"
  }
  ```
  Responses include the created `MovieMetadata` or `TVShowMetadata` document. Duplicate insertions return `409 Conflict`.
- SignalR: `/hub/metadata` emits scan operation updates (`ScanOperationUpdated` and `ScanOperationDeleted`).

## Error Payload Shape
Errors follow a basic JSON contract:
```json
{ "message": "Explanation of what went wrong." }
```
Conflict responses may include additional context.

## Related Documents
- [File Management Module](backend/file-management.md) for domain logic and background copy executor details.
- [Metadata Domain](backend/metadata.md) for storage schema and helper APIs.
- [Metadata Scanning Pipeline](backend/metadata-scanning.md) for scan lifecycle events.
