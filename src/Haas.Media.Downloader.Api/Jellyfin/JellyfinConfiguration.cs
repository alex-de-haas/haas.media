using System;
using System.Collections.Generic;
using System.Linq;
using Haas.Media.Downloader.Api.Authentication;
using Haas.Media.Downloader.Api.Files;

namespace Haas.Media.Downloader.Api.Jellyfin;

public static class JellyfinConfiguration
{
    public static WebApplicationBuilder AddJellyfin(this WebApplicationBuilder builder)
    {
        builder.Services.AddScoped<JellyfinAuthService>();
        builder.Services.AddSingleton<JellyfinService>();

        return builder;
    }

    public static WebApplication UseJellyfin(this WebApplication app)
    {
        var group = app.MapGroup("/jellyfin").WithTags("Jellyfin");

        group.MapGet(
                "/System/Info/Public",
                (JellyfinService jellyfinService) =>
                {
                    var info = jellyfinService.GetSystemInfo();
                    return Results.Ok(info);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinSystemInfoPublic");

        group.MapGet(
                "/System/Info",
                (JellyfinService jellyfinService) => Results.Ok(jellyfinService.GetSystemInfo())
            )
            .AllowAnonymous()
            .WithName("JellyfinSystemInfo");

        group.MapGet(
                "/System/Ping",
                () => Results.Ok("Pong")
            )
            .AllowAnonymous()
            .WithName("JellyfinSystemPing");

        group.MapPost(
                "/Users/AuthenticateByName",
                async (
                    HttpContext context,
                    JellyfinAuthenticateRequest request,
                    JellyfinAuthService authService
                ) =>
                {
                    var clientInfo = authService.GetClientInfo(context.Request);
                    var response = await authService.AuthenticateAsync(request, clientInfo);
                    return response is null ? Results.Unauthorized() : Results.Ok(response);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinAuthenticateByName");

        group.MapGet(
                "/Users/Public",
                async (JellyfinAuthService authService) =>
                {
                    var users = await authService.GetPublicUsersAsync();
                    return Results.Ok(users);
                }
            )
            .AllowAnonymous()
            .WithName("JellyfinPublicUsers");

        group.MapGet(
                "/Library/MediaFolders",
                async (
                    HttpContext context,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
                        {
                            var libraries = await jellyfinService.GetLibrariesAsync();
                            return Results.Ok(libraries);
                        }
                    )
            )
            .WithName("JellyfinMediaFolders");

        group.MapGet(
                "/Users",
                async (
                    HttpContext context,
                    JellyfinAuthService authService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        user =>
                        {
                            var contract = authService.CreateUserContract(user);
                            var envelope = new JellyfinUserEnvelope { Items = new[] { contract } };
                            return Task.FromResult<IResult>(Results.Ok(envelope));
                        }
                    )
            )
            .WithName("JellyfinUsers");

        group.MapGet(
                "/Users/Me",
                async (
                    HttpContext context,
                    JellyfinAuthService authService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        user => Task.FromResult<IResult>(Results.Ok(authService.CreateUserContract(user)))
                    )
            )
            .WithName("JellyfinCurrentUser");

        group.MapGet(
                "/Users/{userId}",
                async (
                    HttpContext context,
                    string userId,
                    JellyfinAuthService authService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        user =>
                        {
                            if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                            {
                                return Task.FromResult<IResult>(Results.Forbid());
                            }

                            return Task.FromResult<IResult>(Results.Ok(authService.CreateUserContract(user)));
                        }
                    )
            )
            .WithName("JellyfinUserById");

        group.MapGet(
                "/Users/{userId}/Views",
                async (
                    HttpContext context,
                    string userId,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async user =>
                        {
                            if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                            {
                                return Results.Forbid();
                            }

                            var libraries = await jellyfinService.GetLibrariesAsync();
                            return Results.Ok(libraries);
                        }
                    )
            )
            .WithName("JellyfinUserViews");

        group.MapGet(
                "/Sessions",
                async (
                    HttpContext context,
                    JellyfinAuthService authService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        user =>
                        {
                            var clientInfo = authService.GetClientInfo(context.Request);
                            var session = authService.CreateSessionInfo(user, clientInfo);
                            var envelope = new JellyfinSessionEnvelope { Items = new[] { session } };
                            return Task.FromResult<IResult>(Results.Ok(envelope));
                        }
                    )
            )
            .WithName("JellyfinSessions");

        group.MapGet(
                "/Users/{userId}/Items",
                async (
                    HttpContext context,
                    string userId,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async user =>
                        {
                            if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                            {
                                return Results.Forbid();
                            }

                            var query = BuildItemsQuery(context.Request);
                            var items = await jellyfinService.GetItemsAsync(query);
                            return Results.Ok(items);
                        }
                    )
            )
            .WithName("JellyfinUserItems");

        group.MapGet(
                "/Items",
                async (
                    HttpContext context,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
                        {
                            var query = BuildItemsQuery(context.Request);
                            var items = await jellyfinService.GetItemsAsync(query);
                            return Results.Ok(items);
                        }
                    )
            )
            .WithName("JellyfinItems");

        group.MapGet(
                "/Items/{itemId}",
                async (
                    HttpContext context,
                    string itemId,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
                        {
                            var item = await jellyfinService.GetItemByIdAsync(itemId);
                            return item is null ? Results.NotFound() : Results.Ok(item);
                        }
                    )
            )
            .WithName("JellyfinItemById");

        group.MapGet(
                "/Items/{itemId}/Images/{type}",
                async (
                    HttpContext context,
                    string itemId,
                    string type,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
                        {
                            var size = context.Request.Query.TryGetValue("maxWidth", out var sizeValues)
                                ? $"w{sizeValues.FirstOrDefault()}"
                                : "w780";

                            if (string.Equals(context.Request.Query["quality"], "original", StringComparison.OrdinalIgnoreCase))
                            {
                                size = "original";
                            }

                            var url = await jellyfinService.GetImageUrlAsync(itemId, type, size);
                            if (string.IsNullOrWhiteSpace(url))
                            {
                                return Results.NotFound();
                            }

                            return Results.Redirect(url);
                        }
                    )
            )
            .WithName("JellyfinItemImage");

        group.MapGet(
                "/Videos/{itemId}/stream",
                async (
                    HttpContext context,
                    string itemId,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService,
                    VideoStreamingService videoStreamingService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
                        {
                            var mediaPath = await jellyfinService.ResolveMediaPathAsync(itemId);
                            if (mediaPath is null)
                            {
                                return Results.NotFound();
                            }

                            var shouldTranscode = ParseBool(context.Request.Query, "transcode");
                            var format = context.Request.Query["container"].FirstOrDefault()
                                ?? context.Request.Query["format"].FirstOrDefault();
                            var quality = context.Request.Query["quality"].FirstOrDefault();

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
            )
            .WithName("JellyfinStreamVideo");

        group.MapPost(
                "/Items/{itemId}/PlaybackInfo",
                async (
                    HttpContext context,
                    string itemId,
                    JellyfinAuthService authService,
                    JellyfinService jellyfinService
                ) =>
                    await RequireAuthenticatedAsync(
                        context,
                        authService,
                        async _ =>
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

                            return Results.Ok(playbackInfo);
                        }
                    )
            )
            .WithName("JellyfinPlaybackInfo");

        return app;
    }

    private static JellyfinItemsQuery BuildItemsQuery(HttpRequest request)
    {
        var parentId =
            request.Query.TryGetValue("ParentId", out var parent) && parent.Count > 0
                ? parent[0]
                : request.Query.TryGetValue("ParentID", out var parentAlt) && parentAlt.Count > 0
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

                var parts = value.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
                foreach (var part in parts)
                {
                    includeTypes.Add(part);
                }
            }
        }

        var recursive = ParseBool(request.Query, "Recursive");
        var searchTerm = request.Query.TryGetValue("SearchTerm", out var searchValues)
            ? searchValues.FirstOrDefault()
            : null;

        return new JellyfinItemsQuery(parentId, includeTypes, recursive, searchTerm);
    }

    private static async Task<IResult> RequireAuthenticatedAsync(
        HttpContext context,
        JellyfinAuthService authService,
        Func<User, Task<IResult>> action
    )
    {
        var user = await authService.AuthenticateRequestAsync(context.Request);
        if (user is null)
        {
            return Results.Unauthorized();
        }

        return await action(user);
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
}
