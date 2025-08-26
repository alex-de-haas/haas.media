namespace Haas.Media.Downloader.Api.Files;

public static class FilesConfiguration
{
    public static WebApplicationBuilder AddFiles(this WebApplicationBuilder builder)
    {
        // Register FilesService and expose as IFilesApi
        builder.Services.AddSingleton<FilesService>();
        builder.Services.AddSingleton<IFilesApi>(sp => sp.GetRequiredService<FilesService>());
        builder.Services.AddHostedService(sp => sp.GetRequiredService<FilesService>());

        return builder;
    }

    public static WebApplication UseFiles(this WebApplication app)
    {
        // Map FileHub
        app.MapHub<FileHub>("/hub/files");

        app.MapGet(
                "api/files",
                (string? path, IFilesApi filesApi) =>
                {
                    var files = filesApi.GetFiles(path);
                    return Results.Ok(files);
                }
            )
            .WithName("GetFiles")
            .RequireAuthorization();

        app.MapGet(
                "api/files/copy-operations",
                (IFilesApi filesApi) =>
                {
                    var operations = filesApi.GetCopyOperations();
                    return Results.Ok(operations);
                }
            )
            .WithName("GetCopyOperations")
            .RequireAuthorization();

        app.MapPost(
                "api/files/copy",
                async (CopyFileRequest request, IFilesApi filesApi) =>
                {
                    var operationId = await filesApi.StartCopyFileAsync(request.SourcePath, request.DestinationPath);
                    return Results.Ok(new { OperationId = operationId });
                }
            )
            .WithName("StartCopyFile")
            .RequireAuthorization();

        app.MapDelete(
                "api/files/copy-operations/{operationId}",
                async (string operationId, IFilesApi filesApi) =>
                {
                    var cancelled = await filesApi.CancelCopyOperationAsync(operationId);
                    return cancelled ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("CancelCopyOperation")
            .RequireAuthorization();

        app.MapPost(
                "api/files/move",
                (MoveFileRequest request, IFilesApi filesApi) =>
                {
                    filesApi.MoveFile(request.SourcePath, request.DestinationPath);
                    return Results.Ok();
                }
            )
            .WithName("MoveFile")
            .RequireAuthorization();

        app.MapDelete(
                "api/files",
                (string path, IFilesApi filesApi) =>
                {
                    filesApi.DeleteFile(path);
                    return Results.Ok();
                }
            )
            .WithName("DeleteFile")
            .RequireAuthorization();

        app.MapDelete(
                "api/files/directory",
                (string path, IFilesApi filesApi) =>
                {
                    filesApi.DeleteDirectory(path);
                    return Results.Ok();
                }
            )
            .WithName("DeleteDirectory")
            .RequireAuthorization();

        app.MapPost(
                "api/files/directory",
                (CreateDirectoryRequest request, IFilesApi filesApi) =>
                {
                    filesApi.CreateDirectory(request.Path);
                    return Results.Ok();
                }
            )
            .WithName("CreateDirectory")
            .RequireAuthorization();

        return app;
    }
}
