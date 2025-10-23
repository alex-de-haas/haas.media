using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Haas.Media.Services.Files;
using Haas.Media.Services.Metadata;
using Microsoft.AspNetCore.Http;

namespace Haas.Media.Services.Jellyfin;

internal static class JellyfinHelper
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

    internal static async Task<IResult> GetPlaybackInfo(string itemId, JellyfinService service)
    {
        var item = await service.GetItemByIdAsync(itemId);
        if (item is null)
            return Results.NotFound();

        return JellyfinJson(
            new { MediaSources = item.MediaSources, PlaySessionId = Guid.NewGuid().ToString("N"), }
        );
    }

    internal static bool ValidateUserId(dynamic user, string userId) =>
        string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase);

    internal static bool ValidateOptionalUserId(HttpContext context, out IResult? result)
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

    internal static int ParseIntQuery(IQueryCollection query, string key, int defaultValue)
    {
        var value = query[key].FirstOrDefault();
        return int.TryParse(value, out var parsed) ? parsed : defaultValue;
    }

    internal static HashSet<string> ParseIncludeTypes(string? includeTypes)
    {
        var result = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(includeTypes))
            return result;

        foreach (
            var type in includeTypes.Split(
                ',',
                StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries
            )
        )
        {
            result.Add(type);
        }

        return result;
    }

    internal static string ParseImageSize(IQueryCollection query)
    {
        if (string.Equals(query["quality"], "original", StringComparison.OrdinalIgnoreCase))
            return "original";

        return query.TryGetValue("maxWidth", out var sizeValues)
            ? $"w{sizeValues.FirstOrDefault()}"
            : "w780";
    }

    internal static JellyfinItemsQuery BuildItemsQuery(HttpRequest request)
    {
        var parentId =
            request.Query["ParentId"].FirstOrDefault()
            ?? request.Query["parentId"].FirstOrDefault()
            ?? request.Query["ParentID"].FirstOrDefault();

        var includeTypes = ParseIncludeTypes(request.Query["IncludeItemTypes"].FirstOrDefault());
        var recursive =
            ParseBool(request.Query, "Recursive") || ParseBool(request.Query, "recursive");
        var searchTerm =
            request.Query["SearchTerm"].FirstOrDefault()
            ?? request.Query["searchTerm"].FirstOrDefault();

        return new JellyfinItemsQuery(parentId, includeTypes, recursive, searchTerm);
    }

    internal static bool ParseBool(IQueryCollection query, string key)
    {
        var value = query[key].FirstOrDefault();
        return !string.IsNullOrWhiteSpace(value) && bool.TryParse(value, out var parsed) && parsed;
    }

    internal static IResult JellyfinJson<T>(T response) =>
        Results.Json(response, ResponseJsonOptions);

    internal static async Task HandlePlaybackStart(
        string userId,
        JellyfinPlaybackProgressInfo progressInfo,
        IMetadataApi metadataApi
    )
    {
        var itemId = progressInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo =
            await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId)
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId,
            };

        playbackInfo.LastPlayedDate = DateTime.UtcNow;
        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    internal static async Task HandlePlaybackProgress(
        string userId,
        JellyfinPlaybackProgressInfo progressInfo,
        IMetadataApi metadataApi
    )
    {
        var itemId = progressInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo =
            await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId)
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId,
            };

        playbackInfo.PlaybackPositionTicks = progressInfo.PositionTicks;
        playbackInfo.LastPlayedDate = DateTime.UtcNow;
        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    internal static async Task HandlePlaybackStopped(
        string userId,
        JellyfinPlaybackStopInfo stopInfo,
        IMetadataApi metadataApi
    )
    {
        var itemId = stopInfo.ItemId;
        if (string.IsNullOrWhiteSpace(itemId))
            return;

        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo =
            await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId)
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId,
            };

        playbackInfo.PlaybackPositionTicks = stopInfo.PositionTicks;
        playbackInfo.LastPlayedDate = DateTime.UtcNow;

        if (stopInfo.PositionTicks > 0)
        {
            playbackInfo.PlayCount++;
        }

        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    internal static async Task MarkAsPlayed(
        string userId,
        string itemId,
        IMetadataApi metadataApi,
        DateTime datePlayed
    )
    {
        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return;

        var playbackInfo =
            await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId)
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId,
            };

        playbackInfo.Played = true;
        playbackInfo.PlayCount = Math.Max(playbackInfo.PlayCount, 1);
        playbackInfo.LastPlayedDate = datePlayed;
        playbackInfo.PlaybackPositionTicks = 0;

        await metadataApi.SavePlaybackInfoAsync(playbackInfo);
    }

    internal static async Task MarkAsUnplayed(
        string userId,
        string itemId,
        IMetadataApi metadataApi
    )
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

    internal static async Task<JellyfinUserData?> UpdateFavoriteStatus(
        string userId,
        string itemId,
        bool isFavorite,
        IMetadataApi metadataApi
    )
    {
        var fileMetadataId = await ResolveFileMetadataId(itemId, metadataApi);
        if (string.IsNullOrWhiteSpace(fileMetadataId))
            return null;

        var playbackInfo =
            await metadataApi.GetPlaybackInfoAsync(userId, fileMetadataId)
            ?? new FilePlaybackInfo
            {
                Id = FilePlaybackInfo.CreateId(userId, fileMetadataId),
                UserId = userId,
                FileMetadataId = fileMetadataId,
            };

        playbackInfo.IsFavorite = isFavorite;
        playbackInfo.UpdatedAt = DateTime.UtcNow;

        var saved = await metadataApi.SavePlaybackInfoAsync(playbackInfo);

        return new JellyfinUserData
        {
            Played = saved.Played,
            PlaybackPositionTicks = saved.PlaybackPositionTicks,
            IsFavorite = saved.IsFavorite,
            PlayCount = saved.PlayCount,
        };
    }

    internal static async Task<string?> ResolveFileMetadataId(
        string itemId,
        IMetadataApi metadataApi
    )
    {
        if (
            JellyfinIdHelper.TryParseEpisodeId(
                itemId,
                out var seriesId,
                out var seasonNum,
                out var episodeNum
            )
        )
        {
            var files = await metadataApi.GetFilesByMediaIdAsync(seriesId, LibraryType.TVShows);
            var file = files.FirstOrDefault(f =>
                f.SeasonNumber == seasonNum && f.EpisodeNumber == episodeNum
            );
            return file?.Id;
        }

        if (JellyfinIdHelper.TryParseMovieId(itemId, out var movieId))
        {
            var files = await metadataApi.GetFilesByMediaIdAsync(movieId, LibraryType.Movies);
            return files.FirstOrDefault()?.Id;
        }

        return null;
    }
}
