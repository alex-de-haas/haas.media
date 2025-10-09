using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Haas.Media.Downloader.Api.Jellyfin;

public sealed record JellyfinClientInfo(
    string? Client,
    string? Device,
    string? DeviceId,
    string? Version);

public sealed record JellyfinSystemInfoResponse
{
    public required string Id { get; init; }
    public required string ServerName { get; init; }
    public required string ProductName { get; init; }
    public required string Version { get; init; }
    public required string OperatingSystem { get; init; }
    public bool? StartupWizardCompleted { get; init; }
}

public sealed record JellyfinAuthenticateRequest
{
    [JsonPropertyName("Username")]
    public string? Username { get; init; }

    [JsonPropertyName("Pw")]
    public string? Pw { get; init; }

    [JsonPropertyName("Password")]
    public string? Password { get; init; }

    [JsonPropertyName("DeviceId")]
    public string? DeviceId { get; init; }

    [JsonPropertyName("DeviceName")]
    public string? DeviceName { get; init; }
}

public sealed record JellyfinUserContract
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? PrimaryImageTag { get; init; }
    public string? ServerId { get; init; }
}

public sealed record JellyfinSessionInfo
{
    public required string Id { get; init; }
    public required string DeviceId { get; init; }
    public required string DeviceName { get; init; }
    public required string Client { get; init; }
    public required string UserId { get; init; }
    public required string UserName { get; init; }
    public required string ApplicationVersion { get; init; }
    public required string ServerId { get; init; }
}

public sealed record JellyfinAuthenticateResponse
{
    public required string AccessToken { get; init; }
    public required JellyfinUserContract User { get; init; }
    public required JellyfinSessionInfo SessionInfo { get; init; }
}

public sealed record JellyfinLibraryItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? CollectionType { get; init; }
    public string? ServerId { get; init; }
    public bool IsFolder { get; init; } = true;
    public int ChildCount { get; init; }
}

public sealed record JellyfinItemsEnvelope
{
    public required JellyfinItem[] Items { get; init; }
    public int TotalRecordCount { get; init; }
}

public sealed record JellyfinLibraryEnvelope
{
    public required JellyfinLibraryItem[] Items { get; init; }
    public int TotalRecordCount { get; init; }
}

public sealed record JellyfinSessionEnvelope
{
    public required JellyfinSessionInfo[] Items { get; init; }
}

public sealed record JellyfinUserEnvelope
{
    public required JellyfinUserContract[] Items { get; init; }
}

public sealed record JellyfinItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? OriginalTitle { get; init; }
    public string? SortName { get; init; }
    public required string Type { get; init; }
    public string? CollectionType { get; init; }
    public string? MediaType { get; init; }
    public string? ParentId { get; init; }
    public bool IsFolder { get; init; }
    public string? Overview { get; init; }
    public string? Tagline { get; init; }
    public string? Path { get; init; }
    public string? ServerId { get; init; }
    public DateTimeOffset? PremiereDate { get; init; }
    public int? ProductionYear { get; init; }
    public long? RunTimeTicks { get; init; }
    public IReadOnlyDictionary<string, string>? ImageTags { get; init; }
    public IReadOnlyDictionary<string, string>? BackdropImageTags { get; init; }
    public IReadOnlyList<JellyfinMediaSource> MediaSources { get; init; } =
        Array.Empty<JellyfinMediaSource>();
    public JellyfinUserData? UserData { get; init; }
    public string? ParentIndexNumberName { get; init; }
    public int? IndexNumber { get; init; }
    public int? ParentIndexNumber { get; init; }
    public string? SeriesName { get; init; }
    public string? SeriesId { get; init; }
    public string? SeasonId { get; init; }
    public string? SeasonName { get; init; }
    public IReadOnlyList<string>? Genres { get; init; }
}

public sealed record JellyfinMediaSource
{
    public required string Id { get; init; }
    public required string Path { get; init; }
    public string Protocol { get; init; } = "File";
    public string? Container { get; init; }
    public long? Size { get; init; }
    public bool SupportsDirectPlay { get; init; } = true;
    public bool SupportsDirectStream { get; init; } = true;
    public bool SupportsTranscoding { get; init; } = true;
    public IReadOnlyList<JellyfinMediaStream> MediaStreams { get; init; } =
        Array.Empty<JellyfinMediaStream>();
}

public sealed record JellyfinMediaStream
{
    public required string Type { get; init; }
    public string? Codec { get; init; }
    public int Index { get; init; }
    public string? Language { get; init; }
    public bool? IsDefault { get; init; }
}

public sealed record JellyfinUserData
{
    public bool Played { get; init; }
    public double? PlaybackPositionTicks { get; init; }
    public double? PlayedPercentage { get; init; }
}

public sealed record JellyfinMediaPath
{
    public required string AbsolutePath { get; init; }
    public required string RelativePath { get; init; }
    public string? Container { get; init; }
}

public sealed record JellyfinItemsQuery(
    string? ParentId,
    IReadOnlySet<string> IncludeItemTypes,
    bool Recursive,
    string? SearchTerm
);
