namespace Haas.Media.Core.BackgroundTasks;

public interface IBackgroundTaskExecutor<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    Task ExecuteAsync(BackgroundWorkerContext<TTask, TPayload> context);
}
