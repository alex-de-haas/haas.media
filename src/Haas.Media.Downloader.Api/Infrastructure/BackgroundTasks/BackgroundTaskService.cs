using System.Collections.Concurrent;
using System.Threading.Channels;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public class BackgroundTaskService : IBackgroundTaskService, IHostedService, IDisposable
{
    private readonly Channel<BackgroundTaskWorkItem> _channel;
    private readonly ConcurrentDictionary<Guid, BackgroundTaskInfo> _tasks = new();
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _cancellationTokens = new();
    private readonly ILogger<BackgroundTaskService> _logger;
    private readonly IHubContext<BackgroundTaskHub, IBackgroundTaskClient> _hubContext;
    private CancellationTokenSource? _stoppingCts;
    private Task? _processingTask;
    private bool _disposed;

    public BackgroundTaskService(
        ILogger<BackgroundTaskService> logger,
        IHubContext<BackgroundTaskHub, IBackgroundTaskClient> hubContext
    )
    {
        _logger = logger;
        _hubContext = hubContext;
        _channel = Channel.CreateUnbounded<BackgroundTaskWorkItem>(
            new UnboundedChannelOptions
            {
                SingleReader = true,
                SingleWriter = false,
                AllowSynchronousContinuations = false,
            }
        );
    }

    public event EventHandler<BackgroundTaskInfo>? TaskUpdated;

    public Guid Enqueue(string name, Func<BackgroundTaskContext, Task> task, Guid? taskId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name, nameof(name));
        ArgumentNullException.ThrowIfNull(task);

        var resolvedTaskId = taskId ?? Guid.NewGuid();
        var cancellationTokenSource = new CancellationTokenSource();

        var taskInfo = BackgroundTaskInfo.CreatePending(resolvedTaskId, name);
        if (!_tasks.TryAdd(resolvedTaskId, taskInfo))
        {
            throw new InvalidOperationException($"A background task with ID {resolvedTaskId} already exists.");
        }

        OnTaskUpdated(taskInfo);

        var workItem = new BackgroundTaskWorkItem(resolvedTaskId, name, task, cancellationTokenSource);
        _cancellationTokens[resolvedTaskId] = cancellationTokenSource;

        if (!_channel.Writer.TryWrite(workItem))
        {
            _tasks.TryRemove(resolvedTaskId, out _);
            _cancellationTokens.TryRemove(resolvedTaskId, out _);
            throw new InvalidOperationException("Unable to enqueue background task.");
        }

        _logger.LogDebug("Queued background task {TaskId} ({TaskName})", resolvedTaskId, name);
        return resolvedTaskId;
    }

    public IReadOnlyCollection<BackgroundTaskInfo> GetTasks() =>
        _tasks.Values.OrderByDescending(t => t.CreatedAt).ToArray();

    public bool TryGetTask(Guid taskId, out BackgroundTaskInfo? taskInfo)
    {
        var found = _tasks.TryGetValue(taskId, out var info);
        taskInfo = info;
        return found;
    }

    public bool TryCancel(Guid taskId)
    {
        if (_cancellationTokens.TryGetValue(taskId, out var cancellationTokenSource))
        {
            if (!cancellationTokenSource.IsCancellationRequested)
            {
                cancellationTokenSource.Cancel();
                _logger.LogInformation(
                    "Cancellation requested for background task {TaskId}",
                    taskId
                );
                ApplyUpdate(
                    taskId,
                    new BackgroundTaskStatusUpdate(null, null, "Cancellation requested", null, null)
                );
                return true;
            }
        }

        return false;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _stoppingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _processingTask = Task.Run(() => ProcessQueueAsync(_stoppingCts.Token), CancellationToken.None);
        return Task.CompletedTask;
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_stoppingCts == null)
        {
            return;
        }

        try
        {
            _stoppingCts.Cancel();
        }
        catch (ObjectDisposedException)
        {
            // Ignore disposed cancellation tokens during shutdown
        }

        _channel.Writer.TryComplete();

        if (_processingTask != null)
        {
            var shutdownTask = _processingTask;
            await Task.WhenAny(shutdownTask, Task.Delay(Timeout.Infinite, cancellationToken));
        }
    }

    public void Dispose()
    {
        if (_disposed)
        {
            return;
        }

        _disposed = true;
        _channel.Writer.TryComplete();

        _stoppingCts?.Cancel();
        _stoppingCts?.Dispose();

        foreach (var kvp in _cancellationTokens)
        {
            kvp.Value.Cancel();
            kvp.Value.Dispose();
        }

        _cancellationTokens.Clear();
    }

    private async Task ProcessQueueAsync(CancellationToken stoppingToken)
    {
        try
        {
            await foreach (var workItem in _channel.Reader.ReadAllAsync(stoppingToken))
            {
                if (stoppingToken.IsCancellationRequested)
                {
                    break;
                }

                if (!_tasks.TryGetValue(workItem.TaskId, out var currentInfo))
                {
                    continue;
                }

                if (workItem.CancellationTokenSource.IsCancellationRequested)
                {
                    ApplyUpdate(
                        workItem.TaskId,
                        new BackgroundTaskStatusUpdate(
                            BackgroundTaskState.Cancelled,
                            null,
                            "Cancelled",
                            null,
                            null
                        )
                    );
                    _cancellationTokens.TryRemove(workItem.TaskId, out _);
                    continue;
                }

                ApplyUpdate(
                    workItem.TaskId,
                    new BackgroundTaskStatusUpdate(
                        BackgroundTaskState.Running,
                        null,
                        "Running",
                        null,
                        null
                    )
                );

                var context = new BackgroundTaskContext(
                    workItem.TaskId,
                    workItem.Name,
                    workItem.CancellationTokenSource,
                    update => ApplyUpdate(workItem.TaskId, update)
                );

                try
                {
                    await workItem.Task(context);

                    if (workItem.CancellationTokenSource.IsCancellationRequested)
                    {
                        ApplyUpdate(
                            workItem.TaskId,
                            new BackgroundTaskStatusUpdate(
                                BackgroundTaskState.Cancelled,
                                null,
                                "Cancelled",
                                null,
                                null
                            )
                        );
                    }
                    else
                    {
                        ApplyUpdate(
                            workItem.TaskId,
                            new BackgroundTaskStatusUpdate(
                                BackgroundTaskState.Completed,
                                100,
                                "Completed",
                                null,
                                null
                            )
                        );
                    }
                }
                catch (OperationCanceledException)
                {
                    ApplyUpdate(
                        workItem.TaskId,
                        new BackgroundTaskStatusUpdate(
                            BackgroundTaskState.Cancelled,
                            null,
                            "Cancelled",
                            null,
                            null
                        )
                    );
                }
                catch (Exception ex)
                {
                    _logger.LogError(
                        ex,
                        "Error while running background task {TaskId} ({TaskName})",
                        workItem.TaskId,
                        workItem.Name
                    );
                    ApplyUpdate(
                        workItem.TaskId,
                        new BackgroundTaskStatusUpdate(
                            BackgroundTaskState.Failed,
                            null,
                            "Failed",
                            null,
                            ex.Message
                        )
                    );
                }
                finally
                {
                    _cancellationTokens.TryRemove(workItem.TaskId, out var cts);
                    cts?.Dispose();
                }
            }
        }
        catch (OperationCanceledException)
        {
            // Normal shutdown path
        }
    }

    private void ApplyUpdate(Guid taskId, BackgroundTaskStatusUpdate update)
    {
        _tasks.AddOrUpdate(
            taskId,
            _ =>
            {
                // This path should not normally occur, but guard against missing entries.
                var fallback = BackgroundTaskInfo.CreatePending(taskId, "unknown");
                var updated = UpdateInfo(fallback, update);
                OnTaskUpdated(updated);
                return updated;
            },
            (_, existing) =>
            {
                var updated = UpdateInfo(existing, update);
                OnTaskUpdated(updated);
                return updated;
            }
        );
    }

    private static BackgroundTaskInfo UpdateInfo(
        BackgroundTaskInfo current,
        BackgroundTaskStatusUpdate update
    )
    {
        var state = update.State ?? current.State;
        var progress = update.Progress ?? current.Progress;
        var statusMessage = update.StatusMessage ?? current.StatusMessage;
        var payload = update.Payload ?? current.Payload;
        var errorMessage = update.ErrorMessage ?? current.ErrorMessage;

        var stateChanged = update.State.HasValue && update.State.Value != current.State;

        var startedAt = current.StartedAt;
        if (stateChanged && update.State is BackgroundTaskState.Running && startedAt is null)
        {
            startedAt = DateTimeOffset.UtcNow;
        }

        var completedAt = current.CompletedAt;
        if (stateChanged && update.State is { } newState && (newState is BackgroundTaskState.Completed or BackgroundTaskState.Failed or BackgroundTaskState.Cancelled))
        {
            completedAt = DateTimeOffset.UtcNow;
        }
        else if (stateChanged && update.State is BackgroundTaskState.Running)
        {
            completedAt = null;
        }

        return current with
        {
            State = state,
            Progress = progress,
            StatusMessage = statusMessage,
            Payload = payload,
            ErrorMessage = errorMessage,
            StartedAt = startedAt,
            CompletedAt = completedAt,
        };
    }

    private void OnTaskUpdated(BackgroundTaskInfo taskInfo)
    {
        TaskUpdated?.Invoke(this, taskInfo);
        BroadcastTaskUpdate(taskInfo);
    }

    private void BroadcastTaskUpdate(BackgroundTaskInfo taskInfo)
    {
        static bool IsFastSuccess(Task task) => task.IsCompletedSuccessfully;

        var broadcastTask = _hubContext.Clients.All.TaskUpdated(taskInfo);

        if (IsFastSuccess(broadcastTask))
        {
            return;
        }

        _ = broadcastTask.ContinueWith(
            t =>
            {
                if (t.IsFaulted && t.Exception is { } ex)
                {
                    _logger.LogWarning(
                        ex.Flatten(),
                        "Failed to broadcast background task update for {TaskId}",
                        taskInfo.Id
                    );
                }
            },
            TaskScheduler.Default
        );
    }

    private readonly record struct BackgroundTaskWorkItem(
        Guid TaskId,
        string Name,
        Func<BackgroundTaskContext, Task> Task,
        CancellationTokenSource CancellationTokenSource
    );
}
