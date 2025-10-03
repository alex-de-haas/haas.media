# Background Tasks

## Abstractions

### Task Base

```csharp
public abstract class BackgroundTaskBase
{
    protected BackgroundTaskBase(Guid? id = null)
    {
        Id = id ?? Guid.CreateVersion7();
    }

    public Guid Id { get; }

    public string Type => GetType().Name;

    public virtual string Name => Type;
}
```

Tasks provide a stable identifier and a friendly name for UI consumption. The generated GUID defaults to version 7 so recent operations sort naturally when rendered.

### Background Task State

```csharp
public enum BackgroundTaskStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled,
}

public class BackgroundTaskState
{
    public required Guid Id { get; init; }
    public required string Type { get; init; }
    public required string Name { get; init; }

    public BackgroundTaskStatus Status { get; set; }
    public double Progress { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public sealed class BackgroundTaskState<TPayload> : BackgroundTaskState
{
    public TPayload? Payload { get; set; }
}
```

Active operations mutate a shared `BackgroundTaskState<TPayload>` instance. When serialized the generic subclass exposes a `payload` property beside the common metadata so clients receive the domain-specific payload on every update.

### Background Worker Context

```csharp
public sealed class BackgroundWorkerContext<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    internal BackgroundWorkerContext(
        TTask task,
        BackgroundTaskState<TPayload> state,
        Action<BackgroundTaskState<TPayload>> onUpdate,
        CancellationToken cancellationToken)
    { /* ... */ }

    public TTask Task { get; }
    public BackgroundTaskState<TPayload> State { get; }
    public CancellationToken CancellationToken => _cancellationToken;

    public void ThrowIfCancellationRequested();
    public void SetPayload(TPayload payload);
    public void ReportStatus(BackgroundTaskStatus status);
    public void ReportProgress(double progress);
}
```

`SetPayload` replaces the payload and emits an update, while `ReportStatus` and `ReportProgress` mutate the underlying state before notifying listeners. Workers should call `ThrowIfCancellationRequested` at sensible boundaries so host shutdown or user-initiated cancellation can halt long-running work. The manager automatically stamps completion metadata and marks the task as `Completed`, `Cancelled`, or `Failed` when the worker finishes, throws `OperationCanceledException`, or surfaces any other exception.

Rapid update bursts are throttled: only one broadcast per task is emitted every 500 ms, yet terminal states are flushed immediately so clients never miss the final update.

### Background Task Executor Interface

```csharp
public interface IBackgroundTaskExecutor<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    Task ExecuteAsync(BackgroundWorkerContext<TTask, TPayload> context);
}
```

### Background Task Manager

```csharp
public interface IBackgroundTaskManager
{
    Guid RunTask<TTask, TPayload>(TTask task)
        where TTask : BackgroundTaskBase;

    bool CancelTask(Guid taskId);

    IReadOnlyCollection<BackgroundTaskState> GetTasks();

    IReadOnlyCollection<BackgroundTaskState> GetTasks(string type);

    bool TryGetTask(Guid taskId, out BackgroundTaskState? taskState);
}
```

`BackgroundTaskManager` is a singleton that also runs as an `IHostedService`. It keeps per-task cancellation tokens, drives worker execution on the thread pool, and stores the latest `BackgroundTaskState` snapshot in memory for HTTP and SignalR callers. When `CancelTask` is invoked it triggers the worker’s cancellation token; if the worker cooperates the manager records the `Cancelled` status and timestamps. `StopAsync` is invoked during host shutdown, cancelling any remaining work and clearing cached state.

## Runtime Endpoints and Hub

`UseBackgroundTasks` wires the HTTP surface and SignalR hub:

- `GET /api/background-tasks` returns all known tasks.
- `GET /api/background-tasks/{type}` filters by concrete task type (e.g. `CopyOperationTask`).
- `GET /api/background-tasks/{taskId}` retrieves a specific task by identifier.
- `DELETE /api/background-tasks/{taskId}` requests cancellation for an active task.
- SignalR clients connect to `/hub/background-tasks` (optionally adding `?type=<TaskType>`). On connect the hub replays any active tasks before streaming live `TaskUpdated` notifications.

All endpoints require authentication because they expose the same state the hub broadcasts.

## Configuration

Register the manager and any workers during startup:

```csharp
builder.Services.AddBackgroundTasks();

builder.Services.AddBackgroundTask<
    MetadataScanTask,
    ScanOperationInfo,
    MetadataScanTaskExecutor>();

builder.Services.AddBackgroundTask<
    CopyOperationTask,
    CopyOperationInfo,
    CopyOperationTaskExecutor>();
```

`AddBackgroundTasks` registers the `BackgroundTaskManager` as both the singleton implementation of `IBackgroundTaskManager` and an `IHostedService`. Each call to `AddBackgroundTask` registers the corresponding worker as a singleton `IBackgroundTaskExecutor<TTask, TPayload>`; design workers to be thread-safe if multiple tasks of the same type might run concurrently. Complete the setup by invoking `app.UseBackgroundTasks()` so the hub and HTTP endpoints are available to clients.
