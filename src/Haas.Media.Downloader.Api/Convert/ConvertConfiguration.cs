using Haas.Media.Core;
using Haas.Media.Core.FFMpeg;

namespace Haas.Media.Downloader.Api.Convert;

public static class ConvertConfiguration
{
    public static WebApplicationBuilder AddConvert(this WebApplicationBuilder builder)
    {
        GlobalFFOptions.Configure(options =>
            options.BinaryFolder =
                builder.Configuration["FFMPEG_BINARY"]
                ?? throw new InvalidOperationException(
                    "FFMPEG_BINARY environment variable is not set."
                )
        );

        builder.Services.AddSingleton<ConvertService>();
        builder.Services.AddSingleton<IConvertApi>(sp => sp.GetRequiredService<ConvertService>());

        return builder;
    }

    public static WebApplication UseConvert(this WebApplication app)
    {
        app.MapGet(
                "api/convert/media-infos",
                async (string path, IConvertApi convertApi) =>
                {
                    var mediaFiles = await convertApi.GetMediaFilesInfoAsync(path);
                    return Results.Ok(mediaFiles);
                }
            )
            .WithName("GetMediaInfo")
            .RequireAuthorization();

        app.MapPost(
                "api/convert/encode",
                async (EncodeRequest request, IConvertApi convertApi, CancellationToken ct) =>
                {
                    var outputRelativePath = await convertApi.EncodeAsync(request, ct);
                    return Results.Ok(new { output = outputRelativePath });
                }
            )
            .WithName("EncodeMedia")
            .RequireAuthorization();

        return app;
    }
}
