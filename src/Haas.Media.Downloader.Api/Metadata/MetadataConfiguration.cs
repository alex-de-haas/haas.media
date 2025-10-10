using Haas.Media.Downloader.Api.Infrastructure.BackgroundTasks;

namespace Haas.Media.Downloader.Api.Metadata;

public static class MetadataConfiguration
{
    public static WebApplicationBuilder AddMetadata(this WebApplicationBuilder builder)
    {
        builder
            .Services.AddOptions<Tmdb.TmdbClientOptions>()
            .Bind(builder.Configuration.GetSection("Tmdb"))
            .PostConfigure(options => options.Validate());

        builder.Services.AddSingleton(TimeProvider.System);
        builder.Services.AddSingleton<Tmdb.TmdbHttpClientAccessor>();

        builder.Services.AddSingleton(sp =>
        {
            var configuration = sp.GetRequiredService<IConfiguration>();
            var tmdbApiKey =
                configuration["TMDB_API_KEY"]
                ?? throw new ArgumentException("TMDB_API_KEY configuration is required.");

            var client = new TMDbLib.Client.TMDbClient(tmdbApiKey) { DefaultLanguage = "en" };

            var httpClient = sp.GetRequiredService<Tmdb.TmdbHttpClientAccessor>().HttpClient;
            Tmdb.TmdbClientConfigurator.UseHttpClient(client, httpClient);

            return client;
        });

        builder.Services.AddScoped<IMetadataApi, MetadataService>();

        builder.Services.AddBackgroundTask<
            MetadataScanTask,
            ScanOperationInfo,
            MetadataScanTaskExecutor
        >();

        builder.Services.AddBackgroundTask<
            AddToLibraryTask,
            AddToLibraryOperationInfo,
            AddToLibraryTaskExecutor
        >();

        builder.Services.AddBackgroundTask<
            MetadataRefreshTask,
            MetadataRefreshOperationInfo,
            MetadataRefreshTaskExecutor
        >();

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
                    var operationId = await metadataService.StartScanLibrariesAsync(
                        refreshExisting
                    );
                    return Results.Ok(new { operationId, message = "Background scan started" });
                }
            )
            .WithName("StartBackgroundScan")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/refresh/start",
                async (IMetadataApi metadataService) =>
                {
                    var operationId = await metadataService.StartRefreshMetadataAsync();
                    return Results.Ok(
                        new { operationId, message = "Metadata refresh task started" }
                    );
                }
            )
            .WithName("StartMetadataRefresh")
            .RequireAuthorization();

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
                async (IMetadataApi metadataService, int id) =>
                {
                    var movieMetadata = await metadataService.GetMovieMetadataByIdAsync(id);
                    return movieMetadata != null ? Results.Ok(movieMetadata) : Results.NotFound();
                }
            )
            .WithName("GetMovieMetadataById")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/movies/{id}",
                async (IMetadataApi metadataService, int id) =>
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
                async (IMetadataApi metadataService, int id) =>
                {
                    var tvShowMetadata = await metadataService.GetTVShowMetadataByIdAsync(id);
                    return tvShowMetadata != null ? Results.Ok(tvShowMetadata) : Results.NotFound();
                }
            )
            .WithName("GetTVShowMetadataById")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/tvshows/{id}",
                async (IMetadataApi metadataService, int id) =>
                {
                    var deleted = await metadataService.DeleteTVShowMetadataAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteTVShowMetadata")
            .RequireAuthorization();

        // FileMetadata endpoints
        app.MapGet(
                "api/metadata/files",
                async (
                    IMetadataApi metadataService,
                    string? libraryId = null,
                    string? mediaId = null
                ) =>
                {
                    var fileMetadata = await metadataService.GetFileMetadataAsync(
                        libraryId,
                        mediaId
                    );
                    return Results.Ok(fileMetadata);
                }
            )
            .WithName("GetFileMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/files/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var fileMetadata = await metadataService.GetFileMetadataByIdAsync(id);
                    return fileMetadata != null ? Results.Ok(fileMetadata) : Results.NotFound();
                }
            )
            .WithName("GetFileMetadataById")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/files",
                async (FileMetadata fileMetadata, IMetadataApi metadataService) =>
                {
                    var createdFileMetadata = await metadataService.AddFileMetadataAsync(
                        fileMetadata
                    );
                    return Results.Created(
                        $"api/metadata/files/{createdFileMetadata.Id}",
                        createdFileMetadata
                    );
                }
            )
            .WithName("AddFileMetadata")
            .RequireAuthorization();

        app.MapDelete(
                "api/metadata/files/{id}",
                async (IMetadataApi metadataService, string id) =>
                {
                    var deleted = await metadataService.DeleteFileMetadataAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteFileMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/movies/{id}/files",
                async (IMetadataApi metadataService, int id) =>
                {
                    var fileMetadata = await metadataService.GetFilesByMediaIdAsync(
                        id.ToString(),
                        LibraryType.Movies
                    );
                    return Results.Ok(fileMetadata);
                }
            )
            .WithName("GetMovieFiles")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/tvshows/{id}/files",
                async (IMetadataApi metadataService, int id) =>
                {
                    var fileMetadata = await metadataService.GetFilesByMediaIdAsync(
                        id.ToString(),
                        LibraryType.TVShows
                    );
                    return Results.Ok(fileMetadata);
                }
            )
            .WithName("GetTVShowFiles")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/search",
                async (
                    IMetadataApi metadataService,
                    string query,
                    LibraryType? libraryType = null
                ) =>
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
                    var result = await metadataService.AddToLibraryAsync(request);
                    return Results.Ok(result);
                }
            )
            .WithName("AddToLibrary")
            .RequireAuthorization();

        return app;
    }
}
