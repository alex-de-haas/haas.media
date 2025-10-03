using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

[Authorize]
public class BackgroundTaskHub : Hub<IBackgroundTaskClient>
{
    private readonly IBackgroundTaskManager _backgroundTaskManager;

    public BackgroundTaskHub(IBackgroundTaskManager backgroundTaskManager)
    {
        _backgroundTaskManager = backgroundTaskManager;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();

        var requestedType = Context.GetHttpContext()?.Request.Query["type"].ToString();
        var tasks = string.IsNullOrWhiteSpace(requestedType)
            ? _backgroundTaskManager.GetTasks()
            : _backgroundTaskManager.GetTasks(requestedType!);

        foreach (var task in tasks.Where(IsActiveTask))
        {
            await Clients.Caller.TaskUpdated(task);
        }
    }

    private static bool IsActiveTask(BackgroundTaskState task) =>
        task.Status is BackgroundTaskStatus.Pending or BackgroundTaskStatus.Running;
}
