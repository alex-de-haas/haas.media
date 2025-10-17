using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskClient
{
    Task TaskUpdated(BackgroundTaskState taskState);
}
