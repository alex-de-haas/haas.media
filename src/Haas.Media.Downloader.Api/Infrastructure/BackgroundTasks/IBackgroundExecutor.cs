namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskExecutor<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    Task ExecuteAsync(BackgroundWorkerContext<TTask, TPayload> context);
}
