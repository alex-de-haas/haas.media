namespace Haas.Media.Downloader.Api.Files;

public static class FilesConfiguration
{
    public static WebApplicationBuilder AddFiles(this WebApplicationBuilder builder)
    {
        // Register FilesService and expose as IFilesApi
        builder.Services.AddSingleton<FilesService>();
        builder.Services.AddSingleton<IFilesApi>(sp => sp.GetRequiredService<FilesService>());

        return builder;
    }

    public static WebApplication UseFiles(this WebApplication app)
    {
        app.MapGet(
                "api/files",
                async (string? path, IFilesApi filesApi) =>
                {
                    var files = await filesApi.GetFilesAsync(path);
                    return Results.Ok(files);
                }
            )
            .WithName("GetFiles")
            .RequireAuthorization();

        app.MapGet(
                "api/files/info",
                async (string path, IFilesApi filesApi) =>
                {
                    var fileInfo = await filesApi.GetFileInfoAsync(path);
                    return Results.Ok(fileInfo);
                }
            )
            .WithName("GetFileInfo")
            .RequireAuthorization();

        app.MapPost(
                "api/files/copy",
                async (CopyFileRequest request, IFilesApi filesApi) =>
                {
                    await filesApi.CopyFileAsync(request.SourcePath, request.DestinationPath);
                    return Results.Ok();
                }
            )
            .WithName("CopyFile")
            .RequireAuthorization();

        app.MapPost(
                "api/files/move",
                async (MoveFileRequest request, IFilesApi filesApi) =>
                {
                    await filesApi.MoveFileAsync(request.SourcePath, request.DestinationPath);
                    return Results.Ok();
                }
            )
            .WithName("MoveFile")
            .RequireAuthorization();

        app.MapDelete(
                "api/files",
                async (string path, IFilesApi filesApi) =>
                {
                    await filesApi.DeleteFileAsync(path);
                    return Results.Ok();
                }
            )
            .WithName("DeleteFile")
            .RequireAuthorization();

        app.MapDelete(
                "api/files/directory",
                async (string path, IFilesApi filesApi) =>
                {
                    await filesApi.DeleteDirectoryAsync(path);
                    return Results.Ok();
                }
            )
            .WithName("DeleteDirectory")
            .RequireAuthorization();

        app.MapPost(
                "api/files/directory",
                async (CreateDirectoryRequest request, IFilesApi filesApi) =>
                {
                    await filesApi.CreateDirectoryAsync(request.Path);
                    return Results.Ok();
                }
            )
            .WithName("CreateDirectory")
            .RequireAuthorization();

        return app;
    }
}
