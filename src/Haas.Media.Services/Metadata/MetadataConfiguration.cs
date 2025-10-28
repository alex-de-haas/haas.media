using System.Linq;
using System.Security.Claims;
using Haas.Media.Core.BackgroundTasks;
using Haas.Media.Services.Authentication;
using Haas.Media.Services.Infrastructure.BackgroundTasks;

namespace Haas.Media.Services.Metadata;

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
        builder.Services.AddSingleton<ITmdbLanguageProvider, TmdbLanguageProvider>();
        builder.Services.AddSingleton<ITmdbCountryProvider, Tmdb.TmdbCountryProvider>();

        builder.Services.AddSingleton(sp =>
        {
            var configuration = sp.GetRequiredService<IConfiguration>();
            var tmdbApiKey =
                configuration["TMDB_API_KEY"]
                ?? throw new ArgumentException("TMDB_API_KEY configuration is required.");

            var client = new TMDbLib.Client.TMDbClient(tmdbApiKey);
            var httpClient = sp.GetRequiredService<Tmdb.TmdbHttpClientAccessor>().HttpClient;
            Tmdb.TmdbClientConfigurator.UseHttpClient(client, httpClient);

            return client;
        });

        builder.Services.AddSingleton<IMetadataApi, MetadataService>();

        builder.Services.AddBackgroundTask<
            MetadataSyncTask,
            MetadataSyncOperationInfo,
            MetadataSyncTaskExecutor
        >();

        builder.Services.AddBackgroundTask<
            AddToLibraryTask,
            AddToLibraryOperationInfo,
            AddToLibraryTaskExecutor
        >();

        builder.Services.AddBackgroundTask<
            PersonCleanupTask,
            PersonCleanupOperationInfo,
            PersonCleanupTaskExecutor
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

        // New unified metadata sync endpoint
        app.MapPost(
                "api/metadata/sync",
                async (IMetadataApi metadataService, MetadataSyncRequest? request) =>
                {
                    var options = request ?? new MetadataSyncRequest();
                    var operationId = await metadataService.StartMetadataSyncAsync(
                        options.LibraryIds,
                        options.RefreshMovies,
                        options.RefreshTvShows,
                        options.RefreshPeople
                    );
                    return Results.Ok(
                        new { operationId, message = "Metadata sync task started" }
                    );
                }
            )
            .WithName("StartMetadataSync")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/libraries/scan",
                async (IMetadataApi metadataService, LibraryScanRequest? request) =>
                {
                    var options = request ?? new LibraryScanRequest();
                    var operationId = await metadataService.StartLibraryScanAsync(
                        options.ScanForNewFiles,
                        options.UpdateFileMetadata,
                        options.UpdateMovies,
                        options.UpdateTvShows,
                        options.UpdatePeople
                    );
                    return Results.Ok(
                        new { operationId, message = "Library scan task started" }
                    );
                }
            )
            .WithName("StartLibraryScan")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/movies",
                async (
                    HttpContext context,
                    IMetadataApi metadataService,
                    string? libraryId = null
                ) =>
                {
                    var movieMetadata = (
                        await metadataService.GetMovieMetadataAsync(libraryId)
                    ).ToList();
                    var preferredCountry = ResolvePreferredCountryCode(context.User);

                    foreach (var metadata in movieMetadata)
                    {
                        metadata.ReleaseDates = MovieReleaseDateHelper.FilterReleaseDates(
                            metadata.ReleaseDates,
                            preferredCountry
                        );
                    }

                    return Results.Ok(movieMetadata);
                }
            )
            .WithName("GetMovieMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/movies/{id}",
                async (HttpContext context, IMetadataApi metadataService, int id) =>
                {
                    var movieMetadata = await metadataService.GetMovieMetadataByIdAsync(id);
                    if (movieMetadata == null)
                    {
                        return Results.NotFound();
                    }

                    var preferredCountry = ResolvePreferredCountryCode(context.User);
                    movieMetadata.ReleaseDates = MovieReleaseDateHelper.FilterReleaseDates(
                        movieMetadata.ReleaseDates,
                        preferredCountry
                    );

                    return Results.Ok(movieMetadata);
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
                    int? mediaId = null
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
            .RequireAuthorization(AuthorizationPolicies.AllowExternalToken);

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
                        id,
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
                        id,
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

        app.MapGet(
                "api/metadata/people",
                async (
                    IMetadataApi metadataService,
                    int skip = 0,
                    int take = 100,
                    string? query = null
                ) =>
                {
                    var people = await metadataService.GetPeopleMetadataAsync(skip, take, query);
                    return Results.Ok(people);
                }
            )
            .WithName("GetPeopleMetadata")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/people/{id}",
                async (IMetadataApi metadataService, int id) =>
                {
                    var personMetadata = await metadataService.GetPersonMetadataByIdAsync(id);
                    return personMetadata != null ? Results.Ok(personMetadata) : Results.NotFound();
                }
            )
            .WithName("GetPersonMetadataById")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/people/{id}/credits",
                async (IMetadataApi metadataService, int id) =>
                {
                    var personCredits = await metadataService.GetPersonCreditsByIdAsync(id);
                    return personCredits != null ? Results.Ok(personCredits) : Results.NotFound();
                }
            )
            .WithName("GetPersonCreditsById")
            .RequireAuthorization();

        // Playback Info endpoints
        app.MapGet(
                "api/metadata/playback/{fileMetadataId}",
                async (HttpContext context, IMetadataApi metadataService, string fileMetadataId) =>
                {
                    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrWhiteSpace(userId))
                    {
                        return Results.Unauthorized();
                    }

                    var playbackInfo = await metadataService.GetPlaybackInfoAsync(
                        userId,
                        fileMetadataId
                    );
                    return playbackInfo != null ? Results.Ok(playbackInfo) : Results.NotFound();
                }
            )
            .WithName("GetPlaybackInfo")
            .RequireAuthorization();

        app.MapPost(
                "api/metadata/playback",
                async (
                    HttpContext context,
                    IMetadataApi metadataService,
                    SavePlaybackInfoRequest request
                ) =>
                {
                    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrWhiteSpace(userId))
                    {
                        return Results.Unauthorized();
                    }

                    var playbackInfo = new FilePlaybackInfo
                    {
                        Id = FilePlaybackInfo.CreateId(userId, request.FileMetadataId),
                        UserId = userId,
                        FileMetadataId = request.FileMetadataId,
                        PlaybackPositionTicks = request.PlaybackPositionTicks ?? 0,
                        PlayCount = request.PlayCount ?? 0,
                        Played = request.Played ?? false,
                        IsFavorite = request.IsFavorite ?? false,
                        UpdatedAt = DateTime.UtcNow
                    };

                    var savedPlaybackInfo = await metadataService.SavePlaybackInfoAsync(
                        playbackInfo
                    );
                    return Results.Ok(savedPlaybackInfo);
                }
            )
            .WithName("SavePlaybackInfo")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/movies/{id}/playback",
                async (HttpContext context, IMetadataApi metadataService, int id) =>
                {
                    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrWhiteSpace(userId))
                    {
                        return Results.Unauthorized();
                    }

                    var files = await metadataService.GetFilesByMediaIdAsync(
                        id,
                        LibraryType.Movies
                    );
                    var filesList = files.ToList();

                    if (filesList.Count == 0)
                    {
                        return Results.Ok(
                            new MoviePlaybackInfo
                            {
                                MovieId = id,
                                Files = new List<FilePlaybackInfo>(),
                                TotalPlayCount = 0,
                                AnyPlayed = false,
                                IsFavorite = false
                            }
                        );
                    }

                    var playbackInfos = new List<FilePlaybackInfo>();
                    foreach (var file in filesList)
                    {
                        var playbackInfo = await metadataService.GetPlaybackInfoAsync(
                            userId,
                            file.Id!
                        );
                        if (playbackInfo != null)
                        {
                            playbackInfos.Add(playbackInfo);
                        }
                    }

                    var result = new MoviePlaybackInfo
                    {
                        MovieId = id,
                        Files = playbackInfos,
                        TotalPlayCount = playbackInfos.Sum(p => p.PlayCount),
                        AnyPlayed = playbackInfos.Any(p => p.Played),
                        IsFavorite = playbackInfos.Any(p => p.IsFavorite)
                    };

                    return Results.Ok(result);
                }
            )
            .WithName("GetMoviePlaybackInfo")
            .RequireAuthorization();

        app.MapGet(
                "api/metadata/tvshows/{id}/playback",
                async (HttpContext context, IMetadataApi metadataService, int id) =>
                {
                    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrWhiteSpace(userId))
                    {
                        return Results.Unauthorized();
                    }

                    var files = await metadataService.GetFilesByMediaIdAsync(
                        id,
                        LibraryType.TVShows
                    );
                    var filesList = files.ToList();

                    if (filesList.Count == 0)
                    {
                        return Results.Ok(
                            new TVShowPlaybackInfo
                            {
                                TVShowId = id,
                                TotalEpisodes = 0,
                                WatchedEpisodes = 0,
                                TotalPlayCount = 0,
                                IsFavorite = false
                            }
                        );
                    }

                    var playbackInfos = new List<FilePlaybackInfo>();
                    foreach (var file in filesList)
                    {
                        var playbackInfo = await metadataService.GetPlaybackInfoAsync(
                            userId,
                            file.Id!
                        );
                        if (playbackInfo != null)
                        {
                            playbackInfos.Add(playbackInfo);
                        }
                    }

                    var result = new TVShowPlaybackInfo
                    {
                        TVShowId = id,
                        TotalEpisodes = filesList.Count,
                        WatchedEpisodes = playbackInfos.Count(p => p.Played),
                        TotalPlayCount = playbackInfos.Sum(p => p.PlayCount),
                        IsFavorite = playbackInfos.Any(p => p.IsFavorite)
                    };

                    return Results.Ok(result);
                }
            )
            .WithName("GetTVShowPlaybackInfo")
            .RequireAuthorization();

        return app;
    }

    private static string? ResolvePreferredCountryCode(ClaimsPrincipal? user)
    {
        var value = user?.FindFirstValue("country_code");
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}

public record RefreshMetadataRequest(
    bool RefreshMovies = true,
    bool RefreshTvShows = true,
    bool RefreshPeople = true
);

public record MetadataSyncRequest(
    List<string>? LibraryIds = null,
    bool RefreshMovies = true,
    bool RefreshTvShows = true,
    bool RefreshPeople = true
);

public record LibraryScanRequest(
    bool ScanForNewFiles = true,
    bool UpdateFileMetadata = false,
    bool UpdateMovies = false,
    bool UpdateTvShows = false,
    bool UpdatePeople = false
);

public record SavePlaybackInfoRequest(
    string FileMetadataId,
    long? PlaybackPositionTicks = null,
    int? PlayCount = null,
    bool? Played = null,
    bool? IsFavorite = null
);

public record MoviePlaybackInfo
{
    public int MovieId { get; init; }
    public List<FilePlaybackInfo> Files { get; init; } = new();
    public int TotalPlayCount { get; init; }
    public bool AnyPlayed { get; init; }
    public bool IsFavorite { get; init; }
}

public record TVShowPlaybackInfo
{
    public int TVShowId { get; init; }
    public int TotalEpisodes { get; init; }
    public int WatchedEpisodes { get; init; }
    public int TotalPlayCount { get; init; }
    public bool IsFavorite { get; init; }
}
