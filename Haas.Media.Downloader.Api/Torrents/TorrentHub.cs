using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Torrents;

public class TorrentHub : Hub
{
    public async Task SendTorrentInfo(TorrentService.TorrentInfo info)
    {
        await Clients.All.SendAsync("ReceiveTorrentInfo", info);
    }
}
