using System.Text.Json;
using Haas.Media.Services.Files;

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

    public static WebApplicationBuilder AddJellyfin(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<JellyfinAuthService>();
        builder.Services.AddSingleton<JellyfinService>();

        return builder;
    }

    public static WebApplication UseJellyfin(this WebApplication app)
    {
        var group = app.MapGroup("/jellyfin")
            .WithTags("Jellyfin")
            .AddEndpointFilter<JellyfinLoggingFilter>();

        group
            .MapGet(
                "/System/Info/Public",
                (JellyfinService jellyfinService) =>
                {
                    var info = jellyfinService.GetSystemInfo();
                    return JellyfinJson(info);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinSystemInfoPublic");

        group
            .MapGet(
                "/System/Info",
                (JellyfinService jellyfinService) =>
                {
                    var info = jellyfinService.GetSystemInfo();
                    return JellyfinJson(info);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinSystemInfo");

        group
            .MapGet("/System/Ping", () => Results.Ok("Pong"))
            .AllowAnonymous()
            .WithName("JellyfinSystemPing");

        group
            .MapGet(
                "/Branding/Configuration",
                () =>
                {
                    var branding = new
                    {
                        LoginDisclaimer = "",
                        CustomCss = "",
                        SplashscreenEnabled = false
                    };
                    return JellyfinJson(branding);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinBrandingConfiguration");

        group
            .MapPost(
                "/Users/AuthenticateByName",
                async (
                    HttpContext context,
                    JellyfinAuthenticateRequest request,
                    JellyfinAuthService authService
                ) =>
                {
                    var clientInfo = authService.GetClientInfo(context.Request);
                    var response = await authService.AuthenticateAsync(request, clientInfo);
                    return response is null ? Results.Unauthorized() : JellyfinJson(response);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinAuthenticateByName");

        group
            .MapGet(
                "/Users/Public",
                async (JellyfinAuthService authService) =>
                {
                    var users = await authService.GetPublicUsersAsync();
                    return JellyfinJson(users);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinPublicUsers");

        group
            .MapGet(
                "/Library/MediaFolders",
                async (JellyfinService jellyfinService) =>
                {
                    var libraries = await jellyfinService.GetLibrariesAsync();
                    return JellyfinJson(libraries);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinMediaFolders");

        group
            .MapGet(
                "/Library/VirtualFolders",
                async (JellyfinService jellyfinService) =>
                {
                    var virtualFolders = await jellyfinService.GetVirtualFoldersAsync();
                    return JellyfinJson(virtualFolders);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinVirtualFolders");

        group
            .MapGet(
                "/DisplayPreferences/{displayPreferencesId}",
                (string displayPreferencesId, string? userId, string client) =>
                {
                    // Return default display preferences
                    var preferences = new JellyfinDisplayPreferencesDto
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
                    };
                    return JellyfinJson(preferences);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinGetDisplayPreferences");

        group
            .MapPost(
                "/DisplayPreferences/{displayPreferencesId}",
                (
                    string displayPreferencesId,
                    string? userId,
                    string client,
                    JellyfinDisplayPreferencesDto preferences
                ) =>
                {
                    // Accept preferences but don't persist (placeholder)
                    return Results.NoContent();
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUpdateDisplayPreferences");

        group
            .MapGet(
                "/Users",
                (HttpContext context, JellyfinAuthService authService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    var contract = authService.CreateUserContract(user);
                    var users = new[] { contract };
                    return JellyfinJson(users);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUsers");

        group
            .MapGet(
                "/Users/Me",
                (HttpContext context, JellyfinAuthService authService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    var contract = authService.CreateUserContract(user);
                    return JellyfinJson(contract);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinCurrentUser");

        group
            .MapGet(
                "/Users/{userId}",
                (HttpContext context, string userId, JellyfinAuthService authService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var contract = authService.CreateUserContract(user);
                    return JellyfinJson(contract);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserById");

        group
            .MapGet(
                "/Users/{userId}/Views",
                async (HttpContext context, string userId, JellyfinService jellyfinService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var views = await jellyfinService.GetLibraryViewsAsync();
                    return JellyfinJson(views);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserViews");

        group
            .MapGet(
                "/Users/{userId}/GroupingOptions",
                (HttpContext context, string userId) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    // Return empty array - grouping options not implemented yet
                    var groupingOptions = Array.Empty<object>();
                    return JellyfinJson(groupingOptions);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinGroupingOptions");

        group
            .MapGet(
                "/Sessions",
                (HttpContext context, JellyfinAuthService authService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    var clientInfo = authService.GetClientInfo(context.Request);
                    var session = authService.CreateSessionInfo(user, clientInfo);
                    var sessions = new[] { session };
                    return JellyfinJson(sessions);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinSessions");

        group
            .MapGet(
                "/Users/{userId}/Items",
                async (HttpContext context, string userId, JellyfinService jellyfinService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var query = BuildItemsQuery(context.Request);
                    var items = await jellyfinService.GetItemsAsync(query);
                    return JellyfinJson(items);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItems");

        group
            .MapGet(
                "/Users/{userId}/Items/Latest",
                async (HttpContext context, string userId, JellyfinService jellyfinService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var limit = int.TryParse(
                        context.Request.Query["Limit"].FirstOrDefault(),
                        out var l
                    )
                        ? l
                        : 16;
                    var parentId = context.Request.Query["ParentId"].FirstOrDefault();
                    var includeTypes = context.Request.Query["IncludeItemTypes"].FirstOrDefault();

                    // Build query for latest items
                    var includeTypesSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    if (!string.IsNullOrWhiteSpace(includeTypes))
                    {
                        foreach (
                            var type in includeTypes.Split(
                                ',',
                                StringSplitOptions.TrimEntries
                                    | StringSplitOptions.RemoveEmptyEntries
                            )
                        )
                        {
                            includeTypesSet.Add(type);
                        }
                    }

                    var query = new JellyfinItemsQuery(parentId, includeTypesSet, true, null);
                    var allItems = await jellyfinService.GetItemsAsync(query);

                    // Return latest items (sorted by premiere date or creation date)
                    var latestItems = allItems
                        .Items.OrderByDescending(i => i.PremiereDate ?? DateTimeOffset.MinValue)
                        .Take(limit)
                        .ToArray();

                    return JellyfinJson(latestItems);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemsLatest");

        group
            .MapGet(
                "/Users/{userId}/Items/Resume",
                (HttpContext context, string userId) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var limit = int.TryParse(
                        context.Request.Query["Limit"].FirstOrDefault(),
                        out var l
                    )
                        ? l
                        : 12;
                    var parentId = context.Request.Query["ParentId"].FirstOrDefault();
                    var includeTypes = context.Request.Query["IncludeItemTypes"].FirstOrDefault();

                    // Build query for resume items
                    var includeTypesSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    if (!string.IsNullOrWhiteSpace(includeTypes))
                    {
                        foreach (
                            var type in includeTypes.Split(
                                ',',
                                StringSplitOptions.TrimEntries
                                    | StringSplitOptions.RemoveEmptyEntries
                            )
                        )
                        {
                            includeTypesSet.Add(type);
                        }
                    }

                    // For now, return empty array as resume functionality requires playback tracking
                    // This will be implemented when playback progress is persisted
                    var resumeItems = Array.Empty<JellyfinItem>();

                    return JellyfinJson(resumeItems);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemsResume");

        group
            .MapGet(
                "/Items",
                async (HttpContext context, JellyfinService jellyfinService) =>
                {
                    var query = BuildItemsQuery(context.Request);
                    var items = await jellyfinService.GetItemsAsync(query);
                    return JellyfinJson(items);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItems");

        group
            .MapGet(
                "/Items/{itemId}",
                async (string itemId, JellyfinService jellyfinService) =>
                {
                    var item = await jellyfinService.GetItemByIdAsync(itemId);
                    if (item is not null) { }
                    return item is null ? Results.NotFound() : JellyfinJson(item);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItemById");

        // Alias route with user prefix (some clients use this variation)
        group
            .MapGet(
                "/Users/{userId}/Items/{itemId}",
                async (
                    HttpContext context,
                    string userId,
                    string itemId,
                    JellyfinService jellyfinService
                ) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                    {
                        return Results.Forbid();
                    }

                    var item = await jellyfinService.GetItemByIdAsync(itemId);
                    if (item is not null) { }
                    return item is null ? Results.NotFound() : JellyfinJson(item);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinUserItemById");

        // Seasons endpoint for TV series (used by Infuse)
        group
            .MapGet(
                "/Shows/{seriesId}/Seasons",
                async (HttpContext context, string seriesId, JellyfinService jellyfinService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    // Verify userId if provided
                    var userId = context.Request.Query["userId"].FirstOrDefault();
                    if (
                        !string.IsNullOrWhiteSpace(userId)
                        && !string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase)
                    )
                    {
                        return Results.Forbid();
                    }

                    // Build query to get seasons for the series
                    var query = BuildItemsQuery(context.Request);
                    // Override parentId with seriesId
                    query = query with
                    {
                        ParentId = seriesId
                    };
                    // Ensure we only get Season items
                    var includeTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                    {
                        "Season"
                    };
                    query = query with { IncludeItemTypes = includeTypes };

                    var items = await jellyfinService.GetItemsAsync(query);
                    return JellyfinJson(items);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinShowSeasons");

        // Episodes endpoint for TV series (used by Infuse)
        group
            .MapGet(
                "/Shows/{seriesId}/Episodes",
                async (HttpContext context, string seriesId, JellyfinService jellyfinService) =>
                {
                    var user = JellyfinAuthFilter.GetAuthenticatedUser(context);
                    // Verify userId if provided
                    var userId = context.Request.Query["userId"].FirstOrDefault();
                    if (
                        !string.IsNullOrWhiteSpace(userId)
                        && !string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase)
                    )
                    {
                        return Results.Forbid();
                    }

                    // Build query to get episodes
                    var query = BuildItemsQuery(context.Request);

                    // Check if a specific seasonId is requested
                    var seasonId = context.Request.Query["seasonId"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(seasonId))
                    {
                        // Get episodes for specific season
                        query = query with
                        {
                            ParentId = seasonId
                        };
                    }
                    else
                    {
                        // Get all episodes for the series
                        query = query with
                        {
                            ParentId = seriesId
                        };
                    }

                    // Ensure we only get Episode items
                    var includeTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                    {
                        "Episode"
                    };
                    query = query with { IncludeItemTypes = includeTypes };

                    var items = await jellyfinService.GetItemsAsync(query);
                    return JellyfinJson(items);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinShowEpisodes");

        group
            .MapGet(
                "/Items/{itemId}/Images/{type}",
                async (
                    HttpContext context,
                    string itemId,
                    string type,
                    JellyfinService jellyfinService,
                    IHttpClientFactory httpClientFactory,
                    ILogger<JellyfinService> logger
                ) =>
                {
                    var size = context.Request.Query.TryGetValue("maxWidth", out var sizeValues)
                        ? $"w{sizeValues.FirstOrDefault()}"
                        : "w780";

                    if (
                        string.Equals(
                            context.Request.Query["quality"],
                            "original",
                            StringComparison.OrdinalIgnoreCase
                        )
                    )
                    {
                        size = "original";
                    }

                    var url = await jellyfinService.GetImageUrlAsync(itemId, type, size);
                    if (string.IsNullOrWhiteSpace(url))
                    {
                        return Results.NotFound();
                    }

                    try
                    {
                        var httpClient = httpClientFactory.CreateClient();
                        var response = await httpClient.GetAsync(url);

                        if (!response.IsSuccessStatusCode)
                        {
                            logger.LogWarning(
                                "Failed to fetch image from TMDB: {Url}, Status: {StatusCode}",
                                url,
                                response.StatusCode
                            );
                            return Results.NotFound();
                        }

                        var imageBytes = await response.Content.ReadAsByteArrayAsync();
                        var contentType =
                            response.Content.Headers.ContentType?.ToString() ?? "image/jpeg";

                        return Results.File(imageBytes, contentType);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Error fetching image from TMDB: {Url}", url);
                        return Results.Problem("Failed to fetch image");
                    }
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinItemImage");

        group
            .MapGet(
                "/Videos/{itemId}/stream",
                async (
                    HttpContext context,
                    string itemId,
                    JellyfinService jellyfinService,
                    VideoStreamingService videoStreamingService,
                    ILogger<JellyfinService> logger
                ) =>
                {
                    var mediaPath = await jellyfinService.ResolveMediaPathAsync(itemId);
                    if (mediaPath is null)
                    {
                        return Results.NotFound();
                    }

                    // Parse query parameters according to Jellyfin API spec
                    var isStatic = ParseBool(context.Request.Query, "static");
                    var shouldTranscode =
                        !isStatic && ParseBool(context.Request.Query, "transcode");

                    var format =
                        context.Request.Query["container"].FirstOrDefault()
                        ?? context.Request.Query["format"].FirstOrDefault();
                    var quality = context.Request.Query["quality"].FirstOrDefault();

                    // Log playback request for debugging
                    var mediaSourceId = context.Request.Query["mediaSourceId"].FirstOrDefault();
                    var playSessionId = context.Request.Query["playSessionId"].FirstOrDefault();

                    logger.LogInformation(
                        "Video stream request: ItemId={ItemId}, Static={IsStatic}, Transcode={ShouldTranscode}, Container={Container}, MediaSourceId={MediaSourceId}, PlaySessionId={PlaySessionId}",
                        itemId,
                        isStatic,
                        shouldTranscode,
                        format,
                        mediaSourceId,
                        playSessionId
                    );

                    await videoStreamingService.StreamVideoAsync(
                        mediaPath.AbsolutePath,
                        context,
                        shouldTranscode,
                        format,
                        quality
                    );

                    return Results.Empty;
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinStreamVideo");

        group
            .MapGet(
                "/Videos/{itemId}/stream.{container}",
                async (
                    HttpContext context,
                    string itemId,
                    string container,
                    JellyfinService jellyfinService,
                    VideoStreamingService videoStreamingService,
                    ILogger<JellyfinService> logger
                ) =>
                {
                    var mediaPath = await jellyfinService.ResolveMediaPathAsync(itemId);
                    if (mediaPath is null)
                    {
                        return Results.NotFound();
                    }

                    var isStatic = ParseBool(context.Request.Query, "static");
                    var shouldTranscode = !isStatic;
                    var quality = context.Request.Query["quality"].FirstOrDefault();

                    logger.LogInformation(
                        "Video stream request with extension: ItemId={ItemId}, Container={Container}, Static={IsStatic}",
                        itemId,
                        container,
                        isStatic
                    );

                    await videoStreamingService.StreamVideoAsync(
                        mediaPath.AbsolutePath,
                        context,
                        shouldTranscode,
                        container,
                        quality
                    );

                    return Results.Empty;
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinStreamVideoWithContainer");

        group
            .MapGet(
                "/Items/{itemId}/PlaybackInfo",
                async (string itemId, JellyfinService jellyfinService) =>
                {
                    var item = await jellyfinService.GetItemByIdAsync(itemId);
                    if (item is null)
                    {
                        return Results.NotFound();
                    }

                    var playbackInfo = new
                    {
                        MediaSources = item.MediaSources,
                        PlaySessionId = Guid.NewGuid().ToString("N"),
                    };

                    return JellyfinJson(playbackInfo);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinPlaybackInfoGet");

        group
            .MapPost(
                "/Items/{itemId}/PlaybackInfo",
                async (string itemId, JellyfinService jellyfinService) =>
                {
                    var item = await jellyfinService.GetItemByIdAsync(itemId);
                    if (item is null)
                    {
                        return Results.NotFound();
                    }

                    var playbackInfo = new
                    {
                        MediaSources = item.MediaSources,
                        PlaySessionId = Guid.NewGuid().ToString("N"),
                    };

                    return JellyfinJson(playbackInfo);
                }
            )
            .AddEndpointFilter<JellyfinAuthFilter>()
            .WithName("JellyfinPlaybackInfoPost");

        return app;
    }

    private static JellyfinItemsQuery BuildItemsQuery(HttpRequest request)
    {
        // Support both ParentId and parentId (case variations)
        var parentId =
            request.Query.TryGetValue("ParentId", out var parent) && parent.Count > 0
                ? parent[0]
                : request.Query.TryGetValue("parentId", out var parentLower)
                && parentLower.Count > 0
                    ? parentLower[0]
                    : request.Query.TryGetValue("ParentID", out var parentAlt)
                    && parentAlt.Count > 0
                        ? parentAlt[0]
                        : null;

        var includeTypes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        if (request.Query.TryGetValue("IncludeItemTypes", out var typeValues))
        {
            foreach (var value in typeValues)
            {
                if (string.IsNullOrWhiteSpace(value))
                {
                    continue;
                }

                var parts = value.Split(
                    ',',
                    StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries
                );
                foreach (var part in parts)
                {
                    includeTypes.Add(part);
                }
            }
        }

        var recursive =
            ParseBool(request.Query, "Recursive") || ParseBool(request.Query, "recursive");

        var searchTerm = request.Query.TryGetValue("SearchTerm", out var searchValues)
            ? searchValues.FirstOrDefault()
            : request.Query.TryGetValue("searchTerm", out var searchAlt)
                ? searchAlt.FirstOrDefault()
                : null;

        return new JellyfinItemsQuery(parentId, includeTypes, recursive, searchTerm);
    }

    private static bool ParseBool(IQueryCollection query, string key)
    {
        if (query.TryGetValue(key, out var values))
        {
            var value = values.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(value) && bool.TryParse(value, out var parsed))
            {
                return parsed;
            }
        }

        return false;
    }

    private static IResult JellyfinJson<T>(T response)
    {
        return Results.Json(response, ResponseJsonOptions);
    }
}
