using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Encodings;

[Authorize]
public class EncodingHub : Hub
{
    public async Task SendEncodingInfo(EncodingProcessInfo info)
    {
        await Clients.All.SendAsync("ReceiveEncodingInfo", info);
    }
}
