namespace Haas.Media.Downloader.Api.Torrents;

public static class TorrentConfiguration
{
    public static WebApplicationBuilder AddTorrent(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<TorrentService>();

        return builder;
    }

    public static WebApplication UseTorrent(this WebApplication app)
    {
        app.MapPost(
                "api/torrents/upload",
                async (HttpRequest request, TorrentService torrentService) =>
                {
                    var form = await request.ReadFormAsync();
                    var file = form.Files["file"];
                    await torrentService.AddTorrent(file!.OpenReadStream());
                    return Results.Ok();
                }
            )
            .WithName("UploadTorrent");

        app.MapGet(
                "api/torrents",
                (TorrentService torrentService) =>
                {
                    return Results.Ok(torrentService.GetUploadedTorrents());
                }
            )
            .WithName("GetTorrents");

        app.MapPost(
                "api/torrents/{hash}/start",
                async (string hash, TorrentService torrentService) =>
                {
                    return await torrentService.StartAsync(hash) ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("StartTorrent");

        app.MapPost(
                "api/torrents/{hash}/stop",
                async (string hash, TorrentService torrentService) =>
                {
                    return await torrentService.StopAsync(hash) ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("StopTorrent");

        app.MapDelete(
                "api/torrents/{hash}",
                async (string hash, bool? deleteData, TorrentService torrentService) =>
                {
                    var delete = deleteData ?? false;
                    return await torrentService.DeleteAsync(hash, delete) ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteTorrent");

        app.MapHub<TorrentHub>("/hub/torrents");

        return app;
    }
}
