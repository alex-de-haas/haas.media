using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Files;

public static class FilesConfiguration
{
    public static WebApplicationBuilder AddFiles(this WebApplicationBuilder builder)
    {
        // Register FilesService and expose as IFilesApi
        builder.Services.AddSingleton<FilesService>();
        builder.Services.AddSingleton<IFilesApi>(sp => sp.GetRequiredService<FilesService>());

        builder.Services.AddBackgroundTask<CopyOperationTask, CopyOperationInfo, CopyOperationTaskExecutor>();

        return builder;
    }

    public static WebApplication UseFiles(this WebApplication app)
    {
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
                "api/files/stream",
                async (string path, HttpContext context, IFilesApi filesApi, IConfiguration configuration) =>
                {
                    var dataPath = configuration["DATA_DIRECTORY"] 
                        ?? throw new InvalidOperationException("DATA_DIRECTORY configuration is required.");
                    
                    var filePath = Path.Combine(dataPath, path);
                    
                    if (!File.Exists(filePath))
                    {
                        return Results.NotFound("File not found");
                    }

                    // Ensure we're not accessing outside the root path
                    var fullFilePath = Path.GetFullPath(filePath);
                    var fullRootPath = Path.GetFullPath(dataPath);

                    if (!fullFilePath.StartsWith(fullRootPath, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var fileInfo = new FileInfo(filePath);
                    var fileStream = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.Read);
                    
                    // Get content type based on file extension
                    var contentType = GetContentType(fileInfo.Extension);
                    
                    // Support range requests for video streaming
                    var rangeHeader = context.Request.Headers.Range.ToString();
                    if (!string.IsNullOrEmpty(rangeHeader))
                    {
                        var range = ParseRangeHeader(rangeHeader, fileInfo.Length);
                        if (range.HasValue)
                        {
                            var (start, end) = range.Value;
                            var length = end - start + 1;
                            
                            fileStream.Seek(start, SeekOrigin.Begin);
                            context.Response.StatusCode = 206; // Partial Content
                            context.Response.Headers.ContentRange = $"bytes {start}-{end}/{fileInfo.Length}";
                            context.Response.Headers.ContentLength = length;
                            context.Response.ContentType = contentType;
                            context.Response.Headers.AcceptRanges = "bytes";
                            
                            await fileStream.CopyToAsync(context.Response.Body);
                            await fileStream.DisposeAsync();
                            return Results.Empty;
                        }
                    }
                    
                    // Normal response
                    context.Response.Headers.AcceptRanges = "bytes";
                    return Results.Stream(fileStream, contentType, fileInfo.Name, enableRangeProcessing: true);
                }
            )
            .WithName("StreamFile")
            .RequireAuthorization();

        app.MapPost(
                "api/files/upload",
                async (HttpRequest request, IFilesApi filesApi) =>
                {
                    if (!request.HasFormContentType)
                    {
                        return Results.BadRequest("Multipart form data is required.");
                    }

                    var form = await request.ReadFormAsync();
                    var targetPath =
                        request.Query.TryGetValue("path", out var queryPath)
                            ? queryPath.FirstOrDefault()
                            : form.TryGetValue("path", out var formPath)
                                ? formPath.FirstOrDefault()
                                : null;

                    var overwrite = false;
                    if (
                        request.Query.TryGetValue("overwrite", out var queryOverwrite)
                        && bool.TryParse(queryOverwrite, out var queryOverwriteParsed)
                    )
                    {
                        overwrite = queryOverwriteParsed;
                    }
                    else if (
                        form.TryGetValue("overwrite", out var formOverwrite)
                        && bool.TryParse(formOverwrite, out var formOverwriteParsed)
                    )
                    {
                        overwrite = formOverwriteParsed;
                    }

                    if (form.Files.Count == 0)
                    {
                        return Results.BadRequest("No files provided.");
                    }

                    var result = await filesApi.UploadAsync(targetPath, form.Files, overwrite);

                    var response = new
                    {
                        uploaded = result.Uploaded,
                        skipped = result.Skipped,
                        errors = result.Errors,
                    };

                    if (result.Uploaded == 0 && result.Errors.Count > 0)
                    {
                        return Results.BadRequest(response);
                    }

                    return Results.Ok(response);
                }
            )
            .WithName("UploadFiles")
            .RequireAuthorization();

        app.MapPost(
                "api/files/copy",
                async (CopyFileRequest request, IFilesApi filesApi) =>
                {
                    var operationId = await filesApi.StartCopyAsync(request.SourcePath, request.DestinationPath);
                    return Results.Ok(new { OperationId = operationId });
                }
            )
            .WithName("StartCopy")
            .RequireAuthorization();

        app.MapPost(
                "api/files/move",
                (MoveFileRequest request, IFilesApi filesApi) =>
                {
                    filesApi.Move(request.SourcePath, request.DestinationPath);
                    return Results.Ok();
                }
            )
            .WithName("Move")
            .RequireAuthorization();

        app.MapDelete(
                "api/files",
                (string path, IFilesApi filesApi) =>
                {
                    filesApi.Delete(path);
                    return Results.Ok();
                }
            )
            .WithName("Delete")
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

        app.MapPut(
                "api/files/rename",
                (RenameRequest request, IFilesApi filesApi) =>
                {
                    filesApi.RenameFile(request.Path, request.NewName);
                    return Results.Ok();
                }
            )
            .WithName("Rename")
            .RequireAuthorization();

        return app;
    }

    private static string GetContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".mp4" => "video/mp4",
            ".mkv" => "video/x-matroska",
            ".webm" => "video/webm",
            ".avi" => "video/x-msvideo",
            ".mov" => "video/quicktime",
            ".wmv" => "video/x-ms-wmv",
            ".flv" => "video/x-flv",
            ".m4v" => "video/x-m4v",
            ".mpg" or ".mpeg" => "video/mpeg",
            ".ogv" => "video/ogg",
            ".3gp" => "video/3gpp",
            _ => "application/octet-stream"
        };
    }

    private static (long start, long end)? ParseRangeHeader(string rangeHeader, long fileSize)
    {
        if (!rangeHeader.StartsWith("bytes="))
            return null;

        var range = rangeHeader["bytes=".Length..].Split('-');
        if (range.Length != 2)
            return null;

        long start = 0;
        long end = fileSize - 1;

        if (!string.IsNullOrEmpty(range[0]))
        {
            if (!long.TryParse(range[0], out start))
                return null;
        }

        if (!string.IsNullOrEmpty(range[1]))
        {
            if (!long.TryParse(range[1], out end))
                return null;
        }

        if (start > end || start >= fileSize)
            return null;

        end = Math.Min(end, fileSize - 1);

        return (start, end);
    }
}
