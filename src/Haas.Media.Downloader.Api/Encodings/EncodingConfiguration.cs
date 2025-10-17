using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Core.FFMpeg;
using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

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

        builder.Services.AddSingleton<EncodingService>();
        builder.Services.AddSingleton<IEncodingApi>(sp => sp.GetRequiredService<EncodingService>());
        builder.Services.AddBackgroundTask<
            EncodingTask,
            EncodingProcessInfo,
            EncodingTaskExecutor
        >();

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
                    var mediaFiles = await convertApi.GetEncodingInfoAsync(path);
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
                "api/encodings/{id}",
                async (string id, IEncodingApi convertApi) =>
                {
                    await convertApi.StopEncodingAsync(id);
                    return Results.Ok();
                }
            )
            .WithName("StopAndDeleteEncoding")
            .RequireAuthorization();

        return app;
    }
}
