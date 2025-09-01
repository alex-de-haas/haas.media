namespace Haas.Media.Downloader.Api.Metadata;

public static class MetadataConfiguration
{
    public static WebApplicationBuilder AddMetadata(this WebApplicationBuilder builder)
    {
        // Register the metadata service
        builder.Services.AddScoped<MetadataService>();
        builder.Services.AddScoped<IMetadataApi>(sp => sp.GetRequiredService<MetadataService>());

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
                        DirectoryPath = request.DirectoryPath,
                        Title = request.Title,
                        Description = request.Description
                    };

                    var createdLibrary = await metadataService.AddLibraryAsync(library);
                    return Results.Created($"api/metadata/libraries/{createdLibrary.Id}", createdLibrary);
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
                        DirectoryPath = request.DirectoryPath,
                        Title = request.Title,
                        Description = request.Description
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

        return app;
    }
}
