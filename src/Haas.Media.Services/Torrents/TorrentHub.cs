using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Services.Torrents;

[Authorize]
public class TorrentHub : Hub
{
    public async Task SendTorrentInfo(TorrentInfo info)
    {
        await Clients.All.SendAsync("ReceiveTorrentInfo", info);
    }
}
