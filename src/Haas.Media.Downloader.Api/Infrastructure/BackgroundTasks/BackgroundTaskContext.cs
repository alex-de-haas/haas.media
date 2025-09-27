using System.Diagnostics.CodeAnalysis;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public sealed class BackgroundTaskContext
{
    private readonly CancellationTokenSource _cancellationTokenSource;
    private readonly Action<BackgroundTaskStatusUpdate> _onUpdate;

    internal BackgroundTaskContext(
        Guid taskId,
        string name,
        CancellationTokenSource cancellationTokenSource,
        Action<BackgroundTaskStatusUpdate> onUpdate
    )
    {
        TaskId = taskId;
        Name = name;
        _cancellationTokenSource = cancellationTokenSource;
        _onUpdate = onUpdate;
    }

    public Guid TaskId { get; }

    public string Name { get; }

    public CancellationToken CancellationToken => _cancellationTokenSource.Token;

    public bool IsCancellationRequested => _cancellationTokenSource.IsCancellationRequested;

    public void ThrowIfCancellationRequested() => _cancellationTokenSource.Token.ThrowIfCancellationRequested();

    public void ReportProgress(double progress, string? statusMessage = null, object? payload = null)
    {
        var normalizedProgress = double.IsFinite(progress) ? Math.Clamp(progress, 0, 100) : 0;
        _onUpdate(new BackgroundTaskStatusUpdate(null, normalizedProgress, statusMessage, payload, null));
    }

    public void ReportStatus(string? statusMessage, object? payload = null)
    {
        _onUpdate(new BackgroundTaskStatusUpdate(null, null, statusMessage, payload, null));
    }

    public void SetPayload(object? payload)
    {
        _onUpdate(new BackgroundTaskStatusUpdate(null, null, null, payload, null));
    }

    public void SetState(
        BackgroundTaskState state,
        string? statusMessage = null,
        object? payload = null,
        string? errorMessage = null
    )
    {
        _onUpdate(new BackgroundTaskStatusUpdate(state, null, statusMessage, payload, errorMessage));
    }
}
