using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Torrents;

[Authorize]
public class TorrentHub : Hub
{
    public async Task SendTorrentInfo(TorrentInfo info)
    {
        await Clients.All.SendAsync("ReceiveTorrentInfo", info);
    }
}
