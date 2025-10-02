namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskManager
{
    Guid RunTask<TTask, TPayload>(TTask task)
        where TTask : BackgroundTaskBase;

    bool CancelTask(Guid taskId);

    IReadOnlyCollection<BackgroundTaskState> GetTasks();

    IReadOnlyCollection<BackgroundTaskState> GetTasks(string type);

    bool TryGetTask(Guid taskId, out BackgroundTaskState? taskState);
}
