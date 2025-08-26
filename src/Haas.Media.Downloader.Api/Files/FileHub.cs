using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Files;

[Authorize]
public class FileHub : Hub
{
    public async Task SendCopyProgress(CopyOperationInfo info)
    {
        await Clients.All.SendAsync("ReceiveCopyProgress", info);
    }
}
