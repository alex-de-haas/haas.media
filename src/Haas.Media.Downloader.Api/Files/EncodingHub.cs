using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Files;

[Authorize]
public class EncodingHub : Hub
{
    public async Task SendEncodingInfo(EncodingInfo info)
    {
        await Clients.All.SendAsync("ReceiveEncodingInfo", info);
    }
}
