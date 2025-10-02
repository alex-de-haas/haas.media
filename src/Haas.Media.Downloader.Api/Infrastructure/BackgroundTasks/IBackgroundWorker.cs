namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundWorker<TTask, TPayload>
    where TTask : BackgroundTaskBase
{
    Task ExecuteAsync(BackgroundWorkerContext<TTask, TPayload> context);
}
