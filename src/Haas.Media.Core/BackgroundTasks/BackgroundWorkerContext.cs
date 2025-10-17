namespace Haas.Media.Core.BackgroundTasks;

public sealed class BackgroundWorkerContext<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    private readonly Action<BackgroundTaskState<TPayload>> _onUpdate;
    private readonly CancellationToken _cancellationToken;

    public BackgroundWorkerContext(
        TTask task,
        BackgroundTaskState<TPayload> state,
        Action<BackgroundTaskState<TPayload>> onUpdate,
        CancellationToken cancellationToken
    )
    {
        Task = task;
        State = state;
        _onUpdate = onUpdate;
        _cancellationToken = cancellationToken;
    }

    public TTask Task { get; }

    public BackgroundTaskState<TPayload> State { get; }

    public CancellationToken CancellationToken => _cancellationToken;

    public void ThrowIfCancellationRequested() => _cancellationToken.ThrowIfCancellationRequested();

    public void SetPayload(TPayload payload)
    {
        State.Payload = payload;
        _onUpdate(State);
    }

    public void ReportStatus(BackgroundTaskStatus status)
    {
        State.Status = status;
        _onUpdate(State);
    }

    public void ReportProgress(double progress)
    {
        State.Progress = progress;
        _onUpdate(State);
    }
}
