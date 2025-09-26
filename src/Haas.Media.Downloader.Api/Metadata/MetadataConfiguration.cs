namespace Haas.Media.Downloader.Api.Metadata;

public static class MetadataConfiguration
{
    public static WebApplicationBuilder AddMetadata(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<MetadataService>();
        builder.Services.AddScoped<IMetadataApi>(sp => sp.GetRequiredService<MetadataService>());
        builder.Services.AddHostedService(sp => sp.GetRequiredService<MetadataService>());

        return builder;
    }

    public static WebApplication UseMetadata(this WebApplication app)
    {
        app.MapGet(
                "api/metadata/libraries",
                async (IMetadataApi metadataService) =>
                {
                    var libraries = await metadataService.GetLibrariesAsync();
                    return Results.Ok(libraries);
                }
            )
            .WithName("GetLibraries")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/libraries/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var library = await metadataService.GetLibraryAsync(id);
                    return library != null ? Results.Ok(library) : Results.NotFound();
                }
            )
            .WithName("GetLibrary")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/libraries",
                async (CreateLibraryRequest request, IMetadataApi metadataService) =>
                {
                    var library = new LibraryInfo
                    {
                        Type = request.Type,
                        DirectoryPath = request.DirectoryPath,
                        Title = request.Title,
                        Description = request.Description,
                    };

                    var createdLibrary = await metadataService.AddLibraryAsync(library);
                    return Results.Created(
                        $"api/metadata/libraries/{createdLibrary.Id}",
                        createdLibrary
                    );
                }
            )
            .WithName("AddLibrary")
            .RequireAuthorization();

        app.MapPut(
                "api/metadata/libraries/{id}",
                async (string id, UpdateLibraryRequest request, IMetadataApi metadataService) =>
                {
                    var library = new LibraryInfo
                    {
                        Type = request.Type,
                        DirectoryPath = request.DirectoryPath,
                        Title = request.Title,
                        Description = request.Description,
                    };

                    var updatedLibrary = await metadataService.UpdateLibraryAsync(id, library);
                    return updatedLibrary != null ? Results.Ok(updatedLibrary) : Results.NotFound();
                }
            )
            .WithName("UpdateLibrary")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/libraries/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var deleted = await metadataService.DeleteLibraryAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteLibrary")
            .RequireAuthorization();

        // Start background scan operation
        app.MapPost(
                "api/metadata/scan/start",
                async (IMetadataApi metadataService, bool refreshExisting = true) =>
                {
                    var operationId = await metadataService.StartScanLibrariesAsync(refreshExisting);
                    return Results.Ok(new { operationId, message = "Background scan started" });
                }
            )
            .WithName("StartBackgroundScan")
            .RequireAuthorization();

        // Get scan operations
        app.MapGet(
                "api/metadata/scan/operations",
                (IMetadataApi metadataService) =>
                {
                    var operations = metadataService.GetScanOperations();
                    return Results.Ok(operations);
                }
            )
            .WithName("GetScanOperations")
            .RequireAuthorization();

        // Cancel scan operation
        app.MapPost(
                "api/metadata/scan/operations/{operationId}/cancel",
                async (IMetadataApi metadataService, string operationId) =>
                {
                    var cancelled = await metadataService.CancelScanOperationAsync(operationId);
                    return cancelled ? Results.Ok(new { message = "Scan operation cancelled" }) 
                                     : Results.NotFound(new { message = "Scan operation not found" });
                }
            )
            .WithName("CancelScanOperation")
            .RequireAuthorization();

        // Map SignalR hub
        app.MapHub<MetadataHub>("/hub/metadata");

        app.MapGet(
                "api/metadata/movies",
                async (IMetadataApi metadataService, string? libraryId = null) =>
                {
                    var movieMetadata = await metadataService.GetMovieMetadataAsync(libraryId);
                    return Results.Ok(movieMetadata);
                }
            )
            .WithName("GetMovieMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/movies/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var movieMetadata = await metadataService.GetMovieMetadataByIdAsync(id);
                    return movieMetadata != null ? Results.Ok(movieMetadata) : Results.NotFound();
                }
            )
            .WithName("GetMovieMetadataById")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/movies/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var deleted = await metadataService.DeleteMovieMetadataAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteMovieMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/tvshows",
                async (IMetadataApi metadataService, string? libraryId = null) =>
                {
                    var tvShowMetadata = await metadataService.GetTVShowMetadataAsync(libraryId);
                    return Results.Ok(tvShowMetadata);
                }
            )
            .WithName("GetTVShowMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/tvshows/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var tvShowMetadata = await metadataService.GetTVShowMetadataByIdAsync(id);
                    return tvShowMetadata != null ? Results.Ok(tvShowMetadata) : Results.NotFound();
                }
            )
            .WithName("GetTVShowMetadataById")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/tvshows/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var deleted = await metadataService.DeleteTVShowMetadataAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteTVShowMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/search",
                async (IMetadataApi metadataService, string query, LibraryType? libraryType = null) =>
                {
                    if (string.IsNullOrWhiteSpace(query))
                    {
                        return Results.BadRequest(new { message = "Query parameter is required" });
                    }

                    var searchResults = await metadataService.SearchAsync(query, libraryType);
                    return Results.Ok(searchResults);
                }
            )
            .WithName("SearchTMDB")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/add-to-library",
                async (AddToLibraryRequest request, IMetadataApi metadataService) =>
                {
                    try
                    {
                        var result = await metadataService.AddToLibraryAsync(request);
                        return Results.Ok(result);
                    }
                    catch (ArgumentException ex)
                    {
                        return Results.BadRequest(new { message = ex.Message });
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.Conflict(new { message = ex.Message });
                    }
                }
            )
            .WithName("AddToLibrary")
            .RequireAuthorization();

        return app;
    }
}
