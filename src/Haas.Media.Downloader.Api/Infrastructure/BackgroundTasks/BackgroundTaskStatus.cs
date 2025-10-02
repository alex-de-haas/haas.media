namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public enum BackgroundTaskStatus
{
    Pending,
    Running,
    Completed,
    Failed,
    Cancelled
}
