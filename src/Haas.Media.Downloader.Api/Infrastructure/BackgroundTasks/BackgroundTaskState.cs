namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public enum BackgroundTaskState
{
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled
}
