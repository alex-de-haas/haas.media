# Backend API Reference

The Haas.Media backend exposes REST endpoints grouped by domain. Every endpoint requires a valid JWT bearer token unless noted otherwise. SignalR hubs mirror long-running or event-driven operations.

## Authentication & Conventions

- Base URL: depends on deployment; use `http://localhost:8000` when running locally.
- Authentication: Local JWT authentication via `Authorization: Bearer <token>` header. WebSocket connections append `?access_token=` query parameter.
- Success responses follow standard HTTP codes (`200 OK`, `201 Created`, etc.). Validation failures return `400 Bad Request` with a JSON `message` field; conflicts return `409 Conflict`.
- Authentication: See `/docs/backend/local-auth-complete-guide.md` for authentication setup and usage.

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
- `POST /api/encodings` — start an encode job. Body follows `EncodeRequest` (source path, destination path, selected streams, codecs, optional hardware acceleration hints, optional resolution target of SD/HD/FHD/4K).
- `DELETE /api/encodings/{id}` — stop a running job and remove it from the queue.
- SignalR: `/hub/encodings` broadcasts job state transitions and progress percentage.

## File Management

All file system paths are rooted at the configured `DATA_DIRECTORY`; the service rejects traversal attempts.

- `GET /api/files?path=<relative>` — list files and directories. Returns `FileItem[]` with metadata and optional `MediaInfo` for media files.
- `POST /api/files/copy` — enqueue a copy. Body: `{ "sourcePath": "...", "destinationPath": "..." }`. Response contains `OperationId`.
- `GET /api/background-tasks/CopyOperationTask` — inspect active and completed copy jobs. Each task exposes a `CopyOperationInfo` payload with byte counts, progress, and current path details.
- `DELETE /api/background-tasks/{operationId}` — cancel a pending or running copy job by task id.
- `POST /api/files/move` — synchronous move/rename between two relative paths.
- `PUT /api/files/rename` — rename a single item inside its directory. Body: `{ "path": "media/video.mp4", "newName": "video-final.mp4" }`.
- `POST /api/files/directory` — create a directory tree relative to the root.
- `DELETE /api/files?path=<relative>` — delete a single file.
- `DELETE /api/files/directory?path=<relative>` — delete a directory and contents.
- SignalR: connect to `/hub/background-tasks?type=CopyOperationTask` for live `TaskUpdated` events carrying `CopyOperationInfo` payloads.

## Metadata Libraries & Catalog

Metadata is stored in LiteDB collections inside `common.db`. Responses include LiteDB string IDs.

### Libraries

- `GET /api/metadata/libraries` — list libraries with type, root path, and timestamps.
- `GET /api/metadata/libraries/{id}` — retrieve a single library.
- `POST /api/metadata/libraries` — create a library. Body: `{ "type": 1, "directoryPath": "Movies", "title": "Movies", "description": "Optional" }`.
- `PUT /api/metadata/libraries/{id}` — update metadata for an existing library.
- `DELETE /api/metadata/libraries/{id}` — remove a library definition. Stored metadata is not automatically purged.

### Metadata Catalog

- `GET /api/metadata/movies?libraryId=<optional>` — list movie metadata. Includes cast and crew arrays. Note: Files are accessed via separate FileMetadata endpoints.
- `GET /api/metadata/movies/{id}` — fetch a single movie record.
- `GET /api/metadata/movies/{id}/files` — fetch all file associations for a specific movie.
- `DELETE /api/metadata/movies/{id}` — delete a movie metadata record. **Automatically queues a background task to clean up orphaned person metadata** (cast/crew members no longer referenced by any other movies or TV shows). The delete operation returns immediately; cleanup happens asynchronously.
- `GET /api/metadata/tvshows?libraryId=<optional>` — list TV show metadata with nested season/episode information.
- `GET /api/metadata/tvshows/{id}` — fetch a single TV show record.
- `GET /api/metadata/tvshows/{id}/files` — fetch all file associations for a specific TV show (includes episode files with season/episode numbers).
- `DELETE /api/metadata/tvshows/{id}` — delete a TV show metadata record. **Automatically queues a background task to clean up orphaned person metadata** (cast/crew members no longer referenced by any other movies or TV shows). The delete operation returns immediately; cleanup happens asynchronously.

### File Metadata (Many-to-Many Associations)

The system uses `FileMetadata` records to link physical files to media items, enabling multiple files per movie or episode.

- `GET /api/metadata/files?libraryId=<optional>&mediaId=<optional>` — list file associations. Filter by library or specific media item.
- `GET /api/metadata/files/{id}` — fetch a single file metadata record.
- `POST /api/metadata/files` — create a new file-to-media association. Body:
  ```json
  {
    "libraryId": "658f2ab9c6e2f3c47b1f9a88",
    "mediaId": "550",
    "mediaType": 1,
    "filePath": "Movies/Fight Club (1999)/Fight Club.mkv",
    "seasonNumber": null,
    "episodeNumber": null
  }
  ```
  For TV episodes, include `seasonNumber` and `episodeNumber`. Returns the created `FileMetadata` record with generated `id`.
- `DELETE /api/metadata/files/{id}` — remove a file association. Does not delete the physical file or metadata record.

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
- SignalR: connect to `/hub/background-tasks?type=MetadataScanTask` for live scan updates delivered through `TaskUpdated` payloads.

## Node Management

Connect to and manage other Haas.Media server instances for distributed media management. See `/docs/backend/nodes-api.md` for details.

**Configuration:** Set `NODE_URL` environment variable to define this node's public URL for node-to-node communication.

- `GET /api/nodes` — list all connected nodes.
- `GET /api/nodes/{id}` — get a specific node by ID.
- `POST /api/nodes` — connect to a new node. Validates connection and automatically registers this node with the remote server (bidirectional handshake). Body: `{ "name": "...", "url": "...", "apiKey": "..." }`.
- `POST /api/nodes/register` — register an incoming node connection (called automatically by remote nodes during bidirectional handshake). Body: `{ "name": "...", "url": "...", "apiKey": "..." }`.
- `PUT /api/nodes/{id}` — update node configuration. Re-validates if URL changes. Body: `{ "name": "...", "url": "...", "apiKey": "...", "isEnabled": true }`.
- `DELETE /api/nodes/{id}` — remove a node connection.
- `POST /api/nodes/validate` — test connection to a node without saving. Body: `{ "url": "...", "apiKey": "..." }`.

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
