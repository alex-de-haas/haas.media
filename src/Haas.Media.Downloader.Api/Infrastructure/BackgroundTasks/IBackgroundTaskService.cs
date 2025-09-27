namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskService
{
    Guid Enqueue(string name, Func<BackgroundTaskContext, Task> task, Guid? taskId = null);

    IReadOnlyCollection<BackgroundTaskInfo> GetTasks();

    bool TryGetTask(Guid taskId, out BackgroundTaskInfo? taskInfo);

    bool TryCancel(Guid taskId);

    event EventHandler<BackgroundTaskInfo>? TaskUpdated;
}
