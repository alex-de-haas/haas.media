# File Management Module

The file service wraps all file-system access for the downloader API. It exposes browsing, copy/move, rename, and delete operations while enforcing the configured data root and emitting real-time progress over SignalR.

## Responsibilities
- Enumerate directories under `DATA_DIRECTORY` and classify entries as media, other files, or folders.
- Protect the host from path traversal with strict absolute-path validation.
- Run long-running copy operations on the background task scheduler while tracking progress.
- Provide cancellation and monitoring for asynchronous copy jobs.
- Broadcast file activity to connected clients through `/hub/files`.

## Root Path & Validation
- `DATA_DIRECTORY` is required at startup. The service creates it if needed.
- Calls to `GetFiles` and write operations are normalized through `GetValidatedFullPath` to ensure the resolved path stays inside the root. Attempts to escape throw `UnauthorizedAccessException`.
- Hidden files and directories (name starts with `.` or `Hidden` attribute) are filtered out of listings.
- Directory listings return `FileItem[]` sorted with folders first, then files alphabetically.

```csharp
public record FileItem(
    string Name,
    string? Extension,
    string RelativePath,
    long? Size,
    DateTimeOffset LastModified,
    FileItemType Type
);
```

`FileItemType.Media` is assigned using `FileHelper.IsMediaFile`, enabling the UI to surface media metadata.

## Copy & Move Operations
- `StartCopyAsync` validates source and destination paths, computes aggregate size/ file count, then enqueues a background task identified by a GUID.
- Each operation is stored in a `ConcurrentDictionary<string, CopyOperationInfo>` which also feeds the `/api/files/copy-operations` endpoint.
- `CopyOperationTaskExecutor` streams bytes in 80 KB chunks, updating progress, instantaneous speed, estimated remaining time, and copied file count.
- Completion, failure, and cancellation change the `CopyOperationState` and set `CompletedTime`. Completed operations are evicted a few seconds after the final broadcast.
- Directory copies preserve the relative path structure and create directories on demand.
- `CancelCopyOperationAsync` signals the background task so the executor can mark the job as cancelled.

Moving and renaming is synchronous:
- `Move` handles arbitrary path changes (including moving directories) and creates missing destination folders.
- `RenameFile` only changes the filename component inside the same folder and validates collisions.

## SignalR Contracts
The `/hub/files` hub pushes operation lifecycle events:
- `CopyOperationUpdated` — emitted whenever progress, speed, or state change.
- `CopyOperationDeleted` — sent when an operation record is removed after completion or cancellation cleanup.

Clients can subscribe globally or filter by convention on the client side. Copy progress is also available through polling `GET /api/files/copy-operations` for environments where SignalR is unavailable.

## Deletion & Directory Creation
- File deletion uses `File.Delete` guarded by root validation.
- Directory deletion uses `Directory.Delete(path, recursive: true)` and fails fast if the directory is outside the root.
- `CreateDirectory` supports nested paths and creates parents as needed.

## Related Documents
- High-level endpoint list lives in [API.md](../API.md).
- Background task infrastructure is documented in the infrastructure folder.
