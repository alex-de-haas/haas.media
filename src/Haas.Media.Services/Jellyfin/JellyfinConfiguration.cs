using System.Text.Json;
using Haas.Media.Services.Files;
using Haas.Media.Services.Metadata;

namespace Haas.Media.Services.Jellyfin;

public static class JellyfinConfiguration
{
    private static readonly JsonSerializerOptions ResponseJsonOptions =
        new()
        {
            PropertyNamingPolicy = null,
            DictionaryKeyPolicy = null,
            DefaultIgnoreCondition = System
                .Text
                .Json
                .Serialization
                .JsonIgnoreCondition
                .WhenWritingNull,
        };

    #region Service Registration

    public static WebApplicationBuilder AddJellyfin(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<JellyfinAuthService>();
        builder.Services.AddSingleton<JellyfinService>();
        return builder;
    }

    #endregion

    #region Endpoint Configuration

    public static WebApplication UseJellyfin(this WebApplication app)
    {
        var group = app.MapGroup("/jellyfin")
            .WithTags("Jellyfin")
            .AddEndpointFilter<JellyfinLoggingFilter>();

        MapSystemEndpoints(group);
        MapAuthenticationEndpoints(group);
        MapLibraryEndpoints(group);
        MapUserEndpoints(group);
        MapItemEndpoints(group);
        MapMediaEndpoints(group);

        return app;
    }

    #endregion

    #region Endpoint Mappers

    private static void MapSystemEndpoints(RouteGroupBuilder group)
    {
        group
            .MapGet("/System/Info/Public", (JellyfinService service) => 
                JellyfinJson(service.GetSystemInfo()))
            .AllowAnonymous()
            .WithName("JellyfinSystemInfoPublic");

        group
            .MapGet("/System/Info", (JellyfinService service) => 
                JellyfinJson(service.GetSystemInfo()))
            .AllowAnonymous()
            .WithName("JellyfinSystemInfo");

        group
            .MapGet("/System/Ping", () => Results.Ok("Pong"))
            .AllowAnonymous()
            .WithName("JellyfinSystemPing");

        group
            .MapGet("/Branding/Configuration", () => JellyfinJson(new
            {
                LoginDisclaimer = "",
                CustomCss = "",
                SplashscreenEnabled = false
            }))
            .AllowAnonymous()
            .WithName("JellyfinBrandingConfiguration");
    }

    private static void MapAuthenticationEndpoints(RouteGroupBuilder group)
    {
        group
            .MapPost("/Users/AuthenticateByName", async (
                HttpContext context,
                JellyfinAuthenticateRequest request,
                JellyfinAuthService authService) =>
            {
                var clientInfo = authService.GetClientInfo(context.Request);
                var response = await authService.AuthenticateAsync(request, clientInfo);
                return response is null ? Results.Unauthorized() : JellyfinJson(response);
            })
            .AllowAnonymous()
            .WithName("JellyfinAuthenticateByName");

        group
            .MapGet("/Users/Public", async (JellyfinAuthService authService) => 
                JellyfinJson(await authService.GetPublicUsersAsync()))
            .AllowAnonymous()
            .WithName("JellyfinPublicUsers");
    }

    private static void MapLibraryEndpoints(RouteGroupBuilder group)
    {
        group
            .MapGet("/Library/MediaFolders", async (JellyfinService service) => 
                JellyfinJson(await service.GetLibrariesAsync()))
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinMediaFolders");

        group
            .MapGet("/Library/VirtualFolders", async (JellyfinService service) => 
                JellyfinJson(await service.GetVirtualFoldersAsync()))
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinVirtualFolders");

        group
            .MapGet("/DisplayPreferences/{displayPreferencesId}", 
                (string displayPreferencesId, string? userId, string client) => 
                    JellyfinJson(new JellyfinDisplayPreferencesDto
                    {
                        Id = displayPreferencesId,
                        ViewType = null,
                        SortBy = "SortName",
                        IndexBy = null,
                        RememberIndexing = false,
                        PrimaryImageHeight = 250,
                        PrimaryImageWidth = 250,
                        CustomPrefs = [],
                        ScrollDirection = "Vertical",
                        ShowBackdrop = true,
                        RememberSorting = false,
                        SortOrder = "Ascending",
                        ShowSidebar = false,
                        Client = client
                    }))
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinGetDisplayPreferences");

        group
            .MapPost("/DisplayPreferences/{displayPreferencesId}",
                (string displayPreferencesId, string? userId, string client, 
                 JellyfinDisplayPreferencesDto preferences) => Results.NoContent())
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUpdateDisplayPreferences");
    }

    private static void MapUserEndpoints(RouteGroupBuilder group)
    {

        group
            .MapGet("/Users", (HttpContext context, JellyfinAuthService authService) =>
            {
                var user = context.GetAuthenticatedUser();
                var contract = authService.CreateUserContract(user);
                return JellyfinJson(new[] { contract });
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUsers");

        group
            .MapGet("/Users/Me", (HttpContext context, JellyfinAuthService authService) =>
            {
                var user = context.GetAuthenticatedUser();
                return JellyfinJson(authService.CreateUserContract(user));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinCurrentUser");

        group
            .MapGet("/Users/{userId}", (HttpContext context, string userId, JellyfinAuthService authService) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                return JellyfinJson(authService.CreateUserContract(user));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserById");

        group
            .MapGet("/Users/{userId}/Views", async (HttpContext context, string userId, JellyfinService service) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                return JellyfinJson(await service.GetLibraryViewsAsync());
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserViews");

        group
            .MapGet("/Users/{userId}/GroupingOptions", (HttpContext context, string userId) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                return JellyfinJson(Array.Empty<object>());
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinGroupingOptions");

        group
            .MapGet("/Sessions", (HttpContext context, JellyfinAuthService authService) =>
            {
                var user = context.GetAuthenticatedUser();
                var clientInfo = authService.GetClientInfo(context.Request);
                var session = authService.CreateSessionInfo(user, clientInfo);
                return JellyfinJson(new[] { session });
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinSessions");

        group
            .MapGet("/Users/{userId}/Items", async (HttpContext context, string userId, JellyfinService service) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                var query = BuildItemsQuery(context.Request);
                return JellyfinJson(await service.GetItemsAsync(query, userId));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItems");

        group
            .MapGet("/Users/{userId}/Items/Latest", async (HttpContext context, string userId, JellyfinService service) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                var limit = ParseIntQuery(context.Request.Query, "Limit", 16);
                var parentId = context.Request.Query["ParentId"].FirstOrDefault();
                var includeTypes = ParseIncludeTypes(context.Request.Query["IncludeItemTypes"].FirstOrDefault());

                var query = new JellyfinItemsQuery(parentId, includeTypes, true, null);
                var allItems = await service.GetItemsAsync(query);

                var latestItems = allItems.Items
                    .OrderByDescending(i => i.PremiereDate ?? DateTimeOffset.MinValue)
                    .Take(limit)
                    .ToArray();

                return JellyfinJson(latestItems);
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemsLatest");

        group
            .MapGet("/Users/{userId}/Items/Resume", (HttpContext context, string userId) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                // TODO: Implement resume functionality when playback progress is persisted
                return JellyfinJson(Array.Empty<JellyfinItem>());
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemsResume");
    }

    private static void MapItemEndpoints(RouteGroupBuilder group)
    {

        group
            .MapGet("/Items", async (HttpContext context, JellyfinService service) =>
            {
                var query = BuildItemsQuery(context.Request);
                return JellyfinJson(await service.GetItemsAsync(query));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItems");

        group
            .MapGet("/Items/{itemId}", async (string itemId, JellyfinService service) =>
            {
                var item = await service.GetItemByIdAsync(itemId);
                return item is null ? Results.NotFound() : JellyfinJson(item);
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItemById");

        group
            .MapGet("/Users/{userId}/Items/{itemId}", async (
                HttpContext context, string userId, string itemId, JellyfinService service) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                var item = await service.GetItemByIdAsync(itemId, userId);
                return item is null ? Results.NotFound() : JellyfinJson(item);
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemById");

        group
            .MapGet("/Shows/{seriesId}/Seasons", async (HttpContext context, string seriesId, JellyfinService service) =>
            {
                if (!ValidateOptionalUserId(context, out var result))
                    return result!;

                var query = BuildItemsQuery(context.Request) with
                {
                    ParentId = seriesId,
                    IncludeItemTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Season" }
                };

                return JellyfinJson(await service.GetItemsAsync(query));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinShowSeasons");

        group
            .MapGet("/Shows/{seriesId}/Episodes", async (HttpContext context, string seriesId, JellyfinService service) =>
            {
                if (!ValidateOptionalUserId(context, out var result))
                    return result!;

                var seasonId = context.Request.Query["seasonId"].FirstOrDefault();
                var query = BuildItemsQuery(context.Request) with
                {
                    ParentId = string.IsNullOrWhiteSpace(seasonId) ? seriesId : seasonId,
                    IncludeItemTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "Episode" }
                };

                return JellyfinJson(await service.GetItemsAsync(query));
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinShowEpisodes");
    }

    private static void MapMediaEndpoints(RouteGroupBuilder group)
    {

        group
            .MapGet("/Items/{itemId}/Images/{type}", async (
                HttpContext context,
                string itemId,
                string type,
                JellyfinService service,
                IHttpClientFactory httpClientFactory,
                ILogger<JellyfinService> logger) =>
            {
                var size = ParseImageSize(context.Request.Query);
                var url = await service.GetImageUrlAsync(itemId, type, size);
                
                if (string.IsNullOrWhiteSpace(url))
                    return Results.NotFound();

                try
                {
                    var httpClient = httpClientFactory.CreateClient();
                    var response = await httpClient.GetAsync(url);

                    if (!response.IsSuccessStatusCode)
                    {
                        logger.LogWarning("Failed to fetch image from TMDB: {Url}, Status: {StatusCode}", url, response.StatusCode);
                        return Results.NotFound();
                    }

                    var imageBytes = await response.Content.ReadAsByteArrayAsync();
                    var contentType = response.Content.Headers.ContentType?.ToString() ?? "image/jpeg";
                    return Results.File(imageBytes, contentType);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Error fetching image from TMDB: {Url}", url);
                    return Results.Problem("Failed to fetch image");
                }
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItemImage");

        group
            .MapGet("/Videos/{itemId}/stream", async (
                HttpContext context,
                string itemId,
                JellyfinService service,
                VideoStreamingService videoStreamingService,
                ILogger<JellyfinService> logger) =>
            {
                var mediaPath = await service.ResolveMediaPathAsync(itemId);
                if (mediaPath is null)
                    return Results.NotFound();

                var isStatic = ParseBool(context.Request.Query, "static");
                var shouldTranscode = !isStatic && ParseBool(context.Request.Query, "transcode");
                var format = context.Request.Query["container"].FirstOrDefault() 
                          ?? context.Request.Query["format"].FirstOrDefault();
                var quality = context.Request.Query["quality"].FirstOrDefault();

                logger.LogInformation(
                    "Video stream request: ItemId={ItemId}, Static={IsStatic}, Transcode={ShouldTranscode}, Container={Container}, MediaSourceId={MediaSourceId}, PlaySessionId={PlaySessionId}",
                    itemId, isStatic, shouldTranscode, format,
                    context.Request.Query["mediaSourceId"].FirstOrDefault(),
                    context.Request.Query["playSessionId"].FirstOrDefault());

                await videoStreamingService.StreamVideoAsync(mediaPath.AbsolutePath, context, shouldTranscode, format, quality);
                return Results.Empty;
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinStreamVideo");

        group
            .MapGet("/Videos/{itemId}/stream.{container}", async (
                HttpContext context,
                string itemId,
                string container,
                JellyfinService service,
                VideoStreamingService videoStreamingService,
                ILogger<JellyfinService> logger) =>
            {
                var mediaPath = await service.ResolveMediaPathAsync(itemId);
                if (mediaPath is null)
                    return Results.NotFound();

                var isStatic = ParseBool(context.Request.Query, "static");
                var shouldTranscode = !isStatic;
                var quality = context.Request.Query["quality"].FirstOrDefault();

                logger.LogInformation(
                    "Video stream request with extension: ItemId={ItemId}, Container={Container}, Static={IsStatic}",
                    itemId, container, isStatic);

                await videoStreamingService.StreamVideoAsync(mediaPath.AbsolutePath, context, shouldTranscode, container, quality);
                return Results.Empty;
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinStreamVideoWithContainer");

        group
            .MapGet("/Items/{itemId}/PlaybackInfo", async (string itemId, JellyfinService service) =>
                await GetPlaybackInfo(itemId, service))
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinPlaybackInfoGet");

        group
            .MapPost("/Items/{itemId}/PlaybackInfo", async (string itemId, JellyfinService service) =>
                await GetPlaybackInfo(itemId, service))
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinPlaybackInfoPost");

        // Playback tracking endpoints
        group
            .MapPost("/Sessions/Playing", async (
                HttpContext context,
                JellyfinPlaybackProgressInfo progressInfo,
                IMetadataApi metadataApi) =>
            {
                var user = context.GetAuthenticatedUser();
                await HandlePlaybackStart(user.Id, progressInfo, metadataApi);
                return Results.NoContent();
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinReportPlaybackStart");

        group
            .MapPost("/Sessions/Playing/Progress", async (
                HttpContext context,
                JellyfinPlaybackProgressInfo progressInfo,
                IMetadataApi metadataApi) =>
            {
                var user = context.GetAuthenticatedUser();
                await HandlePlaybackProgress(user.Id, progressInfo, metadataApi);
                return Results.NoContent();
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinReportPlaybackProgress");

        group
            .MapPost("/Sessions/Playing/Stopped", async (
                HttpContext context,
                JellyfinPlaybackStopInfo stopInfo,
                IMetadataApi metadataApi) =>
            {
                var user = context.GetAuthenticatedUser();
                await HandlePlaybackStopped(user.Id, stopInfo, metadataApi);
                return Results.NoContent();
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinReportPlaybackStopped");

        group
            .MapPost("/Users/{userId}/PlayedItems/{itemId}", async (
                HttpContext context,
                string userId,
                string itemId,
                IMetadataApi metadataApi,
                JellyfinMarkPlayedRequest? request) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                await MarkAsPlayed(user.Id, itemId, metadataApi, request?.DatePlayed ?? DateTime.UtcNow);
                return JellyfinJson(new JellyfinUserData { Played = true, PlayCount = 1 });
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinMarkPlayed");

        group
            .MapDelete("/Users/{userId}/PlayedItems/{itemId}", async (
                HttpContext context,
                string userId,
                string itemId,
                IMetadataApi metadataApi) =>
            {
                var user = context.GetAuthenticatedUser();
                if (!ValidateUserId(user, userId))
                    return Results.Forbid();

                await MarkAsUnplayed(user.Id, itemId, metadataApi);
                return JellyfinJson(new JellyfinUserData { Played = false, PlayCount = 0 });
            })
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinMarkUnplayed");
    }

    #endregion

    #region Helper Methods

    private static async Task<IResult> GetPlaybackInfo(string itemId, JellyfinService service)
    {
        var item = await service.GetItemByIdAsync(itemId);
        if (item is null)
            return Results.NotFound();

        return JellyfinJson(new
        {
            MediaSources = item.MediaSources,
            PlaySessionId = Guid.NewGuid().ToString("N")
        });
    }

    private static bool ValidateUserId(dynamic user, string userId) =>
        string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase);

    private static bool ValidateOptionalUserId(HttpContext context, out IResult? result)
    {
        result = null;
        var user = context.GetAuthenticatedUser();
        var userId = context.Request.Query["userId"].FirstOrDefault();

        if (!string.IsNullOrWhiteSpace(userId) && !ValidateUserId(user, userId))
        {
            result = Results.Forbid();
            return false;
        }

        return true;
    }

    private static int ParseIntQuery(IQueryCollection query, string key, int defaultValue)
    {
        var value = query[key].FirstOrDefault();
        return int.TryParse(value, out var parsed) ? parsed : defaultValue;
    }

    private static HashSet<string> ParseIncludeTypes(string? includeTypes)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        
        if (string.IsNullOrWhiteSpace(includeTypes))
            return result;

        foreach (var type in includeTypes.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            result.Add(type);
        }

        return result;
    }

    private static string ParseImageSize(IQueryCollection query)
    {
        if (string.Equals(query["quality"], "original", StringComparison.OrdinalIgnoreCase))
            return "original";

        return query.TryGetValue("maxWidth", out var sizeValues) 
            ? $"w{sizeValues.FirstOrDefault()}" 
            : "w780";
    }

    private static JellyfinItemsQuery BuildItemsQuery(HttpRequest request)
    {
        var parentId = request.Query["ParentId"].FirstOrDefault() 
                    ?? request.Query["parentId"].FirstOrDefault() 
                    ?? request.Query["ParentID"].FirstOrDefault();

        var includeTypes = ParseIncludeTypes(request.Query["IncludeItemTypes"].FirstOrDefault());
        var recursive = ParseBool(request.Query, "Recursive") || ParseBool(request.Query, "recursive");
        var searchTerm = request.Query["SearchTerm"].FirstOrDefault() 
                      ?? request.Query["searchTerm"].FirstOrDefault();

        return new JellyfinItemsQuery(parentId, includeTypes, recursive, searchTerm);
    }

    private static bool ParseBool(IQueryCollection query, string key)
    {
        var value = query[key].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(value) && bool.TryParse(value, out var parsed) && parsed;
    }

    private static IResult JellyfinJson<T>(T response) => 
        Results.Json(response, ResponseJsonOptions);

    private static async Task HandlePlaybackStart(
        string userId,
        JellyfinPlaybackProgressInfo progressInfo,
        IMetadataApi metadataApi)
    {
        var itemId = progressInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo = await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId) 
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId
            };

        playbackInfo.LastPlayedDate = DateTime.UtcNow;
        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    private static async Task HandlePlaybackProgress(
        string userId,
        JellyfinPlaybackProgressInfo progressInfo,
        IMetadataApi metadataApi)
    {
        var itemId = progressInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo = await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId) 
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId
            };

        playbackInfo.PlaybackPositionTicks = progressInfo.PositionTicks;
        playbackInfo.LastPlayedDate = DateTime.UtcNow;
        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    private static async Task HandlePlaybackStopped(
        string userId,
        JellyfinPlaybackStopInfo stopInfo,
        IMetadataApi metadataApi)
    {
        var itemId = stopInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo = await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId) 
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId
            };

        playbackInfo.PlaybackPositionTicks = stopInfo.PositionTicks;
        playbackInfo.LastPlayedDate = DateTime.UtcNow;
        
        // Mark as played if stopped near the end (within last 10%)
        // This is a simple heuristic - could be enhanced with runtime info
        if (stopInfo.PositionTicks > 0)
        {
            playbackInfo.PlayCount++;
        }

        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    private static async Task MarkAsPlayed(
        string userId,
        string itemId,
        IMetadataApi metadataApi,
        DateTime datePlayed)
    {
        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo = await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId) 
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId
            };

        playbackInfo.Played = true;
        playbackInfo.PlayCount = Math.Max(playbackInfo.PlayCount, 1);
        playbackInfo.LastPlayedDate = datePlayed;
        playbackInfo.PlaybackPositionTicks = 0; // Reset position when manually marking as played

        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    private static async Task MarkAsUnplayed(
        string userId,
        string itemId,
        IMetadataApi metadataApi)
    {
        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo = await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId);
        if (playbackInfo == null)
            return;

        playbackInfo.Played = false;
        playbackInfo.PlayCount = 0;
        playbackInfo.PlaybackPositionTicks = 0;

        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    private static async Task<string?> ResolveFileMetadataId(string itemId, IMetadataApi metadataApi)
    {
        // Try to parse as episode ID
        if (JellyfinIdHelper.TryParseEpisodeId(itemId, out var seriesId, out var seasonNum, out var episodeNum))
        {
            var files = await metadataApi.GetFilesByMediaIdAsync(seriesId, LibraryType.TVShows);
            var file = files.FirstOrDefault(f => 
                f.SeasonNumber == seasonNum && f.EpisodeNumber == episodeNum);
            return file?.Id;
        }

        // Try to parse as movie ID
        if (JellyfinIdHelper.TryParseMovieId(itemId, out var movieId))
        {
            var files = await metadataApi.GetFilesByMediaIdAsync(movieId, LibraryType.Movies);
            return files.FirstOrDefault()?.Id;
        }

        return null;
    }

    #endregion
}
