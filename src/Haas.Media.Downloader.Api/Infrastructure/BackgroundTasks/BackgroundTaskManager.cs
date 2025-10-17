using System.Collections.Concurrent;
using System.Diagnostics;
using Haas.Media.Core;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public class BackgroundTaskManager : IBackgroundTaskManager, IHostedService
{
    private static readonly ActivitySource ActivitySource = new(
        CommonConstants.ActivitySources.BackgroundTasks
    );

    private readonly ConcurrentDictionary<Guid, BackgroundTaskState> _taskStates = new();
    private readonly ConcurrentDictionary<Guid, CancellationTokenSource> _cancellationTokens =
        new();
    private readonly ConcurrentDictionary<Guid, DateTimeOffset> _lastBroadcastTimes = new();
    private readonly ConcurrentDictionary<Guid, BackgroundTaskState> _pendingBroadcastStates = new();
    private readonly ILogger<BackgroundTaskManager> _logger;
    private readonly IHubContext<BackgroundTaskHub, IBackgroundTaskClient> _hubContext;
    private readonly IServiceProvider _serviceProvider;

    private static readonly TimeSpan BroadcastThrottleInterval = TimeSpan.FromMilliseconds(200);

    public BackgroundTaskManager(
        ILogger<BackgroundTaskManager> logger,
        IHubContext<BackgroundTaskHub, IBackgroundTaskClient> hubContext,
        IServiceProvider serviceProvider
    )
    {
        _logger = logger;
        _hubContext = hubContext;
        _serviceProvider = serviceProvider;
    }

    public Guid RunTask<TTask, TPayload>(TTask task)
        where TTask : BackgroundTaskBase
    {
        ArgumentNullException.ThrowIfNull(task);

        var worker = _serviceProvider.GetRequiredService<IBackgroundTaskExecutor<TTask, TPayload>>();

        var cancellationTokenSource = new CancellationTokenSource();

        var taskState = new BackgroundTaskState<TPayload>
        {
            Id = task.Id,
            Type = task.Type,
            Name = task.Name,
            Status = BackgroundTaskStatus.Pending,
            Progress = 0,
            CreatedAt = DateTimeOffset.UtcNow,
        };

        if (!_taskStates.TryAdd(task.Id, taskState))
        {
            throw new InvalidOperationException(
                $"A background task with ID {task.Id} already exists."
            );
        }

        BroadcastTaskUpdate(taskState);

        _cancellationTokens[task.Id] = cancellationTokenSource;

        var context = new BackgroundWorkerContext<TTask, TPayload>(
            task,
            taskState,
            BroadcastTaskUpdate,
            cancellationTokenSource.Token
        );

        _ = Task.Run(async () =>
        {
            using var activity = ActivitySource.StartActivity(
                $"BackgroundTask.{task.Type}",
                ActivityKind.Internal
            );

            activity?.SetTag("task.id", task.Id.ToString());
            activity?.SetTag("task.type", task.Type);
            activity?.SetTag("task.name", task.Name);

            try
            {
                taskState.Status = BackgroundTaskStatus.Running;
                BroadcastTaskUpdate(taskState);

                activity?.AddEvent(new ActivityEvent("task.started"));

                await worker.ExecuteAsync(context);

                taskState.Status = BackgroundTaskStatus.Completed;
                taskState.Progress = 100;
                taskState.CompletedAt = DateTimeOffset.UtcNow;
                BroadcastTaskUpdate(taskState);

                activity?.SetStatus(ActivityStatusCode.Ok);
                activity?.AddEvent(new ActivityEvent("task.completed"));
            }
            catch (OperationCanceledException)
                when (cancellationTokenSource.IsCancellationRequested)
            {
                taskState.Status = BackgroundTaskStatus.Cancelled;
                taskState.CompletedAt = DateTimeOffset.UtcNow;
                BroadcastTaskUpdate(taskState);

                activity?.SetStatus(ActivityStatusCode.Error, "Task was cancelled");
                activity?.AddEvent(new ActivityEvent("task.cancelled"));
            }
            catch (Exception ex)
            {
                _logger.LogError(
                    ex,
                    "Background task {TaskId} of type {TaskType} failed",
                    taskState.Id,
                    taskState.Type
                );

                taskState.Status = BackgroundTaskStatus.Failed;
                taskState.ErrorMessage = ex.Message;
                taskState.CompletedAt = DateTimeOffset.UtcNow;
                BroadcastTaskUpdate(taskState);

                activity?.SetStatus(ActivityStatusCode.Error, ex.Message);
                activity?.SetTag("exception.type", ex.GetType().FullName);
                activity?.SetTag("exception.message", ex.Message);
                activity?.SetTag("exception.stacktrace", ex.StackTrace);
                activity?.AddEvent(new ActivityEvent("task.failed"));
            }
            finally
            {
                _cancellationTokens.TryRemove(task.Id, out _);

                var duration = taskState.CompletedAt.HasValue
                    ? taskState.CompletedAt.Value - taskState.CreatedAt
                    : TimeSpan.Zero;

                activity?.SetTag("task.duration_ms", duration.TotalMilliseconds);
                activity?.SetTag("task.status", taskState.Status.ToString());
            }
        });

        return task.Id;
    }

    public bool CancelTask(Guid taskId)
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
                return true;
            }
        }

        return false;
    }

    public IReadOnlyCollection<BackgroundTaskState> GetTasks() =>
        _taskStates
            .Values
            .OrderByDescending(t => t.CreatedAt)
            .ToArray();

    public IReadOnlyCollection<BackgroundTaskState> GetTasks(string type) =>
        _taskStates.Values.Where(t => t.Type == type).OrderByDescending(t => t.CreatedAt).ToArray();

    public bool TryGetTask(Guid taskId, out BackgroundTaskState? taskInfo)
    {
        var found = _taskStates.TryGetValue(taskId, out var info);
        taskInfo = info;
        return found;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        foreach (var cancellationTokenSource in _cancellationTokens.Values)
        {
            if (!cancellationTokenSource.IsCancellationRequested)
            {
                cancellationTokenSource.Cancel();
            }
        }

        _cancellationTokens.Clear();
        _taskStates.Clear();
        _lastBroadcastTimes.Clear();
        _pendingBroadcastStates.Clear();

        return Task.CompletedTask;
    }

    private void BroadcastTaskUpdate(BackgroundTaskState taskState)
    {
        var now = DateTimeOffset.UtcNow;
        var isTerminalState = taskState.Status
            is BackgroundTaskStatus.Completed
                or BackgroundTaskStatus.Cancelled
                or BackgroundTaskStatus.Failed;

        var lastBroadcast = _lastBroadcastTimes.TryGetValue(taskState.Id, out var value)
            ? value
            : DateTimeOffset.MinValue;

        var elapsedSinceLastBroadcast = now - lastBroadcast;

        if (isTerminalState || elapsedSinceLastBroadcast >= BroadcastThrottleInterval)
        {
            _lastBroadcastTimes[taskState.Id] = now;
            _pendingBroadcastStates.TryRemove(taskState.Id, out _);

            SendBroadcast(taskState);

            if (isTerminalState)
            {
                CleanupThrottleState(taskState.Id);
            }

            return;
        }

        var isNewPending = _pendingBroadcastStates.TryAdd(taskState.Id, taskState);

        if (!isNewPending)
        {
            _pendingBroadcastStates[taskState.Id] = taskState;
            return;
        }

        var delay = BroadcastThrottleInterval - elapsedSinceLastBroadcast;

        if (delay <= TimeSpan.Zero)
        {
            TryBroadcastPending(taskState.Id);
            return;
        }

        _ = Task.Delay(delay).ContinueWith(
            _ => TryBroadcastPending(taskState.Id),
            CancellationToken.None,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default
        );
    }

    private void TryBroadcastPending(Guid taskId)
    {
        if (!_pendingBroadcastStates.TryRemove(taskId, out var pendingState))
        {
            return;
        }

        _lastBroadcastTimes[taskId] = DateTimeOffset.UtcNow;
        SendBroadcast(pendingState);
    }

    private void SendBroadcast(BackgroundTaskState taskState)
    {
        static bool IsFastSuccess(Task task) => task.IsCompletedSuccessfully;

        var broadcastTask = _hubContext.Clients.All.TaskUpdated(taskState);

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
                        taskState.Id
                    );
                }
            },
            TaskScheduler.Default
        );
    }

    private void CleanupThrottleState(Guid taskId)
    {
        _pendingBroadcastStates.TryRemove(taskId, out _);
        _lastBroadcastTimes.TryRemove(taskId, out _);
    }
}
