using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Haas.Media.Downloader.Api.Metadata;

[Authorize]
public class MetadataHub : Hub
{
    public async Task SendScanProgress(ScanOperationInfo info)
    {
        await Clients.All.SendAsync("ReceiveScanProgress", info);
    }
}
