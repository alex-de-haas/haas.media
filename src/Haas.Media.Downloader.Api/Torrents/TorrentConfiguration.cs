namespace Haas.Media.Downloader.Api.Torrents;

public static class TorrentConfiguration
{
    public static WebApplicationBuilder AddTorrent(this WebApplicationBuilder builder)
    {
        // Register the hosted service so Start/Stop are called by the host
        builder.Services.AddSingleton<TorrentService>();
        builder.Services.AddSingleton<ITorrentApi>(sp => sp.GetRequiredService<TorrentService>());
        builder.Services.AddHostedService(sp => sp.GetRequiredService<TorrentService>());

        return builder;
    }

    public static WebApplication UseTorrent(this WebApplication app)
    {
        app.MapPost(
                "api/torrents/upload",
                async (HttpRequest request, ITorrentApi torrentService) =>
                {
                    var form = await request.ReadFormAsync();
                    var file = form.Files["file"];
                    await torrentService.AddTorrent(file!.OpenReadStream());
                    return Results.Ok();
                }
            )
            .WithName("UploadTorrent")
            .RequireAuthorization();

        app.MapGet(
                "api/torrents",
                (ITorrentApi torrentService) =>
                {
                    return Results.Ok(torrentService.GetUploadedTorrents());
                }
            )
            .WithName("GetTorrents")
            .RequireAuthorization();

        app.MapPost(
                "api/torrents/{hash}/start",
                async (string hash, ITorrentApi torrentService) =>
                {
                    return await torrentService.StartAsync(hash)
                        ? Results.Ok()
                        : Results.NotFound();
                }
            )
            .WithName("StartTorrent")
            .RequireAuthorization();

        app.MapPost(
                "api/torrents/{hash}/stop",
                async (string hash, ITorrentApi torrentService) =>
                {
                    return await torrentService.StopAsync(hash) ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("StopTorrent")
            .RequireAuthorization();

        app.MapPost(
                "api/torrents/{hash}/pause",
                async (string hash, ITorrentApi torrentService) =>
                {
                    return await torrentService.PauseAsync(hash)
                        ? Results.Ok()
                        : Results.NotFound();
                }
            )
            .WithName("PauseTorrent")
            .RequireAuthorization();

        app.MapDelete(
                "api/torrents/{hash}",
                async (string hash, bool? deleteData, ITorrentApi torrentService) =>
                {
                    var delete = deleteData ?? false;
                    return await torrentService.DeleteAsync(hash, delete)
                        ? Results.Ok()
                        : Results.NotFound();
                }
            )
            .WithName("DeleteTorrent")
            .RequireAuthorization();

        app.MapHub<TorrentHub>("/hub/torrents").RequireAuthorization();

        return app;
    }
}
