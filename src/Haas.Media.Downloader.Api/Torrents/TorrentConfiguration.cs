using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
                async (ITorrentApi torrentService, HttpRequest request) =>
                {
                    var form = await request.ReadFormAsync();
                    if (form.Files.Count == 0)
                    {
                        return Results.BadRequest("No torrent files uploaded.");
                    }

                    var errors = new List<string>();
                    var uploaded = 0;

                    foreach (var file in form.Files)
                    {
                        if (file is null || file.Length <= 0)
                        {
                            errors.Add($"{file?.FileName ?? "(unknown)"} is empty or missing.");
                            continue;
                        }

                        try
                        {
                            await using var stream = file.OpenReadStream();
                            await torrentService.StartFromStreamAsync(stream);
                            uploaded++;
                        }
                        catch (Exception ex)
                        {
                            errors.Add($"{file.FileName}: {ex.Message}");
                        }
                    }

                    if (uploaded == 0)
                    {
                        return Results.BadRequest(new { uploaded, errors });
                    }

                    return Results.Ok(new { uploaded, failed = errors.Count, errors });
                }
            )
            .WithName("UploadTorrent")
            .RequireAuthorization();

        app.MapPost(
                "api/torrents/from-file",
                async ([FromQuery] string path, ITorrentApi torrentService) =>
                {
                    if (string.IsNullOrWhiteSpace(path))
                    {
                        return Results.BadRequest("Path is required.");
                    }

                    await torrentService.StartFromFileAsync(path);

                    return Results.Ok();
                }
            )
            .WithName("StartTorrentFromFile")
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
                async (ITorrentApi torrentService, string hash) =>
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
                async (ITorrentApi torrentService, string hash) =>
                {
                    return await torrentService.StopAsync(hash) ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("StopTorrent")
            .RequireAuthorization();

        app.MapPost(
                "api/torrents/{hash}/pause",
                async (ITorrentApi torrentService, string hash) =>
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
                async (ITorrentApi torrentService, string hash, bool deleteData = false) =>
                {
                    return await torrentService.DeleteAsync(hash, deleteData)
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
