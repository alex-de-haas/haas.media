using Haas.Media.Core.FFMpeg;

namespace Haas.Media.Downloader.Api.Encodings;

public static class EncodingConfiguration
{
    public static WebApplicationBuilder AddEncoding(this WebApplicationBuilder builder)
    {
        GlobalFFOptions.Configure(options =>
            options.BinaryFolder =
                builder.Configuration["FFMPEG_BINARY"]
                ?? throw new InvalidOperationException("FFMPEG_BINARY configuration is required")
        );

        // Register FileService and expose as IFileApi. Also register it as a hosted service
        builder.Services.AddSingleton<EncodingService>();
        builder.Services.AddSingleton<IEncodingApi>(sp => sp.GetRequiredService<EncodingService>());
        builder.Services.AddHostedService(sp => sp.GetRequiredService<EncodingService>());

        return builder;
    }

    public static WebApplication UseEncoding(this WebApplication app)
    {
        app.MapGet(
                "api/encodings",
                (IEncodingApi convertApi) =>
                {
                    var encodings = convertApi.GetEncodingsAsync();
                    return Results.Ok(encodings);
                }
            )
            .WithName("GetEncodings")
            .RequireAuthorization();

        app.MapGet(
                "api/encodings/info",
                async (string path, IEncodingApi convertApi) =>
                {
                    var mediaFiles = await convertApi.GetMediaFilesInfoAsync(path);
                    return Results.Ok(mediaFiles);
                }
            )
            .WithName("GetMediaFiles")
            .RequireAuthorization();

        app.MapPost(
                "api/encodings",
                async (
                    EncodeRequest request,
                    IEncodingApi convertApi,
                    CancellationToken ct
                ) =>
                {
                    await convertApi.StartEncodingAsync(request, ct);
                    return Results.Ok();
                }
            )
            .WithName("EncodeMediaFiles")
            .RequireAuthorization();

        app.MapDelete(
                "api/encodings/{hash}",
                async (string id, IEncodingApi convertApi) =>
                {
                    await convertApi.StopEncodingAsync(id);
                    return Results.Ok();
                }
            )
            .WithName("StopAndDeleteEncoding")
            .RequireAuthorization();

        app.MapHub<EncodingHub>("/hub/encodings").RequireAuthorization();

        return app;
    }
}
