using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

[Authorize]
public class BackgroundTaskHub : Hub<IBackgroundTaskClient>
{
    private readonly IBackgroundTaskService _backgroundTaskService;

    public BackgroundTaskHub(IBackgroundTaskService backgroundTaskService)
    {
        _backgroundTaskService = backgroundTaskService;
    }

    public override async Task OnConnectedAsync()
    {
        await base.OnConnectedAsync();

        var tasks = _backgroundTaskService.GetTasks();
        foreach (var task in tasks)
        {
            await Clients.Caller.TaskUpdated(task);
        }
    }
}
