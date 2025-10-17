using Haas.Media.Core.BackgroundTasks;

namespace Haas.Media.Services.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskClient
{
    Task TaskUpdated(BackgroundTaskState taskState);
}
