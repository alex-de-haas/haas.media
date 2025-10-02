# File Management Module

The file service wraps all file-system access for the downloader API. It exposes browsing, copy/move, rename, and delete operations while enforcing the configured data root and emitting real-time progress over SignalR.

## Responsibilities
- Enumerate directories under `DATA_DIRECTORY` and classify entries as media, other files, or folders.
- Protect the host from path traversal with strict absolute-path validation.
- Run long-running copy operations on the background task scheduler while tracking progress.
- Provide cancellation and monitoring for asynchronous copy jobs.
- Broadcast file activity to connected clients through `/hub/background-tasks?type=CopyOperationTask`.

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
- Each operation is tracked by the background task manager; clients query `/api/background-tasks/CopyOperationTask` to hydrate `CopyOperationInfo` payloads and monitor progress.
- `CopyOperationTaskExecutor` streams bytes in 80 KB chunks, updating payload fields (copied bytes/files, instantaneous speed, ETA) while reporting progress through the background task context.
- Completion, failure, and cancellation are reflected by the background task lifecycle; the payload's `CompletedTime` marks when byte transfer finished. Completed operations remain queryable for auditing until the service restarts.
- Directory copies preserve the relative path structure and create directories on demand.
- Cancellation goes through `IBackgroundTaskManager.CancelTask`, exposed to clients as `DELETE /api/background-tasks/{taskId}`.

Moving and renaming is synchronous:
- `Move` handles arbitrary path changes (including moving directories) and creates missing destination folders.
- `RenameFile` only changes the filename component inside the same folder and validates collisions.

## SignalR Contracts
Subscribe to `/hub/background-tasks?type=CopyOperationTask` to receive `TaskUpdated` events that include the latest `CopyOperationInfo` payload. The hub only replays active copy operations on connect; subsequent updates stream as progress changes.

Clients can subscribe globally or filter by convention on the client side. Copy progress is also available through polling `GET /api/background-tasks/CopyOperationTask` when SignalR is unavailable.

## Deletion & Directory Creation
- File deletion uses `File.Delete` guarded by root validation.
- Directory deletion uses `Directory.Delete(path, recursive: true)` and fails fast if the directory is outside the root.
- `CreateDirectory` supports nested paths and creates parents as needed.

## Related Documents
- High-level endpoint list lives in [API.md](../API.md).
- Background task infrastructure is documented in the infrastructure folder.
