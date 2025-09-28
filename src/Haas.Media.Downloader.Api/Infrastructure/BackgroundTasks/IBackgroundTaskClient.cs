using System.Threading.Tasks;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

public interface IBackgroundTaskClient
{
    Task TaskUpdated(BackgroundTaskInfo taskInfo);
}
