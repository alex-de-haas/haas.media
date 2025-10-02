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

    public virtual string DisplayName => Type;

    public virtual string InitialStatusMessage => "Pending";
}
```

Tasks expose identity and display metadata. Payloads are created and published by workers during execution via the worker context APIs.

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

public sealed class BackgroundTaskState<TPayload>
{
    public required Guid Id { get; init; }
    public required string Type { get; init; }
    public required string Name { get; init; }

    public TPayload? Payload { get; set; }
    public BackgroundTaskStatus Status { get; set; }
    public double Progress { get; set; }
    public string? StatusMessage { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTimeOffset CreatedAt { get; init; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
```

### Background Worker Context

```csharp
public sealed class BackgroundWorkerContext<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    internal BackgroundWorkerContext(
        TTask task,
        BackgroundTaskState<TPayload> state,
        BackgroundTaskContext context
    ) { … }

    public TTask Task { get; }
    public BackgroundTaskState<TPayload> State { get; }
    public CancellationToken CancellationToken { get; }

    public void SetPayload(TPayload payload);
    public void ReportStatus(string? statusMessage, TPayload? payload = default);
    public void ReportProgress(double progress, string? statusMessage = null, TPayload? payload = default);
    public void SetStatus(
        BackgroundTaskStatus status,
        string? statusMessage = null,
        TPayload? payload = default,
        string? errorMessage = null
    );
}
```

These helpers forward updates to connected SignalR clients via the task manager. Each call produces a `BackgroundTaskState<TPayload>` snapshot which the manager translates into a `BackgroundTaskInfo` broadcast. Clients no longer receive domain-specific payload wrappers—every update represents the full task state (including any payload assigned by the worker).

### Background Worker Interface

```csharp
public interface IBackgroundWorker<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    Task ExecuteAsync(BackgroundWorkerContext<TTask, TPayload> context);
}
```

### Background Task Manager

The manager orchestrates task execution, persistence, and worker dispatch.

```csharp
public interface IBackgroundTaskManager
{
    Guid RunTask<TTask>(TTask task)
        where TTask : BackgroundTaskBase;

    bool CancelTask(Guid taskId);

    IReadOnlyCollection<BackgroundTaskInfo> GetTasks();

    bool TryGetTask(Guid taskId, out BackgroundTaskInfo? taskInfo);

    event EventHandler<BackgroundTaskInfo>? TaskUpdated;
}
```

`BackgroundTaskInfo` is the DTO exposed over HTTP/SignalR and contains the task name, type, status, progress, timestamps, payload, and error details.

## Configuration

Register workers alongside their task types via DI. The manager resolves workers from a scoped service provider when a task is executed.

```csharp
builder.Services.AddBackgroundTasks();

builder.Services.AddBackgroundTask<MetadataScanTask, MetadataScanTaskExecutor>();
builder.Services.AddBackgroundTask<CopyOperationTask, CopyOperationTaskExecutor>();
```

Workers can depend on scoped services. The manager creates a scope for each execution, ensuring per-task lifetime isolation.
