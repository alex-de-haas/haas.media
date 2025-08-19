using Haas.Media.Core.FFMpeg;

namespace Haas.Media.Downloader.Api.Files;

public static class FileConfiguration
{
    public static WebApplicationBuilder AddFiles(this WebApplicationBuilder builder)
    {
        GlobalFFOptions.Configure(options =>
            options.BinaryFolder =
                builder.Configuration["FFMPEG_BINARY"]
                ?? throw new InvalidOperationException(
                    "FFMPEG_BINARY environment variable is not set."
                )
        );

        // Register FileService and expose as IFileApi. Also register it as a hosted service
        builder.Services.AddSingleton<FileService>();
        builder.Services.AddSingleton<IFileApi>(sp => sp.GetRequiredService<FileService>());
        builder.Services.AddHostedService(sp => sp.GetRequiredService<FileService>());

        return builder;
    }

    public static WebApplication UseFiles(this WebApplication app)
    {
        app.MapGet(
                "api/files/{hash}",
                async (string hash, IFileApi convertApi) =>
                {
                    var mediaFiles = await convertApi.GetMediaFilesInfoAsync(hash);
                    return Results.Ok(mediaFiles);
                }
            )
            .WithName("GetMediaFiles")
            .RequireAuthorization();

        app.MapPost(
                "api/files/{hash}/encode",
                async (
                    string hash,
                    EncodeRequest request,
                    IFileApi convertApi,
                    CancellationToken ct
                ) =>
                {
                    await convertApi.EncodeAsync(hash, request, ct);
                    return Results.Ok();
                }
            )
            .WithName("EncodeMediaFiles")
            .RequireAuthorization();

        app.MapGet(
                "api/encodings",
                (IFileApi convertApi) =>
                {
                    var encodings = convertApi.GetEncodingsAsync();
                    return Results.Ok(encodings);
                }
            )
            .WithName("GetEncodings")
            .RequireAuthorization();

        app.MapHub<EncodingHub>("/hub/encodings").RequireAuthorization();

        return app;
    }
}
