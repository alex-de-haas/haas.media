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
    public string? ServerName { get; init; }
    public bool HasPassword { get; init; }
    public bool HasConfiguredPassword { get; init; }
    public bool EnableAutoLogin { get; init; }
    public DateTime? LastLoginDate { get; init; }
    public DateTime? LastActivityDate { get; init; }
    public JellyfinUserConfiguration Configuration { get; init; } = JellyfinUserConfiguration.Default;
    public JellyfinUserPolicy Policy { get; init; } = JellyfinUserPolicy.Default;
    public double? PrimaryImageAspectRatio { get; init; }
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
    public JellyfinPlayState? PlayState { get; init; }
    public string? RemoteEndPoint { get; init; }
    public string[]? PlayableMediaTypes { get; init; }
    public DateTime? LastActivityDate { get; init; }
    public DateTime? LastPlaybackCheckIn { get; init; }
    public string? DeviceType { get; init; }
    public JellyfinBaseItemDto? NowPlayingItem { get; init; }
    public bool IsActive { get; init; }
    public bool SupportsMediaControl { get; init; }
    public bool SupportsRemoteControl { get; init; }
    public bool HasCustomDeviceName { get; init; }
    public string[]? SupportedCommands { get; init; }
}

public sealed record JellyfinAuthenticateResponse
{
    public required string AccessToken { get; init; }
    public required JellyfinUserContract User { get; init; }
    public required JellyfinSessionInfo SessionInfo { get; init; }
    public required string ServerId { get; init; }
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
    public int StartIndex { get; init; } = 0;
}

public sealed record JellyfinLibraryEnvelope
{
    public required JellyfinLibraryItem[] Items { get; init; }
    public int TotalRecordCount { get; init; }
    public int StartIndex { get; init; } = 0;
}

public sealed record JellyfinItem
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? OriginalTitle { get; init; }
    public string? SortName { get; init; }
    public required string Type { get; init; }
    public string? DisplayPreferencesId { get; init; }
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
    public IReadOnlyList<JellyfinMediaSource>? MediaSources { get; init; }
    public JellyfinUserData? UserData { get; init; }
    public int? ChildCount { get; init; }
    public string? ParentIndexNumberName { get; init; }
    public int? IndexNumber { get; init; }
    public int? ParentIndexNumber { get; init; }
    public string? SeriesName { get; init; }
    public string? SeriesId { get; init; }
    public string? SeasonId { get; init; }
    public string? SeasonName { get; init; }
    public IReadOnlyList<string>? Genres { get; init; }
    public int? LocalTrailerCount { get; init; }
    public int? RemoteTrailerCount { get; init; }
    public bool? CanDelete { get; init; }
    public bool? CanDownload { get; init; }
    public IReadOnlyList<string>? LockedFields { get; init; }
}

public sealed record JellyfinMediaSource
{
    public required string Id { get; init; }
    public required string Path { get; init; }
    public string Protocol { get; init; } = "File";
    public string? Container { get; init; }
    public long? Size { get; init; }
    public string? Name { get; init; }
    public bool IsRemote { get; init; } = false;
    public bool SupportsDirectPlay { get; init; } = true;
    public bool SupportsDirectStream { get; init; } = true;
    public bool SupportsTranscoding { get; init; } = true;
    public string? ETag { get; init; }
    public long? RunTimeTicks { get; init; }
    public bool ReadAtNativeFramerate { get; init; } = false;
    public bool IgnoreDts { get; init; } = false;
    public bool IgnoreIndex { get; init; } = false;
    public bool GenPtsInput { get; init; } = false;
    public bool SupportsTranscode { get; init; } = true;
    public bool SupportsDirectPlayback { get; init; } = true;
    public string Type { get; init; } = "Default";
    public IReadOnlyList<JellyfinMediaStream> MediaStreams { get; init; } =
        Array.Empty<JellyfinMediaStream>();
    public string? VideoType { get; init; }
    public int? DefaultAudioStreamIndex { get; init; }
    public int? DefaultSubtitleStreamIndex { get; init; }
}

public sealed record JellyfinMediaStream
{
    public required string Type { get; init; }
    public string? Codec { get; init; }
    public int Index { get; init; }
    public string? Language { get; init; }
    public bool? IsDefault { get; init; }
    public bool? IsForced { get; init; }
    public bool? IsExternal { get; init; }
    public string? Title { get; init; }
    public string? DisplayTitle { get; init; }
    public string? CodecTag { get; init; }
    public string? Profile { get; init; }
    public int? Height { get; init; }
    public int? Width { get; init; }
    public double? AverageFrameRate { get; init; }
    public double? RealFrameRate { get; init; }
    public string? AspectRatio { get; init; }
    public int? BitRate { get; init; }
    public int? BitDepth { get; init; }
    public int? Channels { get; init; }
    public int? SampleRate { get; init; }
    public string? ChannelLayout { get; init; }
    public bool? IsInterlaced { get; init; }
    public bool? IsAVC { get; init; }
    public string? TimeBase { get; init; }
    public int? RefFrames { get; init; }
    public string? VideoRange { get; init; }
    public string? ColorSpace { get; init; }
    public string? ColorTransfer { get; init; }
    public string? ColorPrimaries { get; init; }
    public bool? SupportsExternalStream { get; init; }
    public string? Path { get; init; }
    public string? PixelFormat { get; init; }
    public int? Level { get; init; }
}

public sealed record JellyfinUserData
{
    public bool Played { get; init; }
    public double? PlaybackPositionTicks { get; init; }
    public double? PlayedPercentage { get; init; }
    public bool? IsFavorite { get; init; }
    public int? PlayCount { get; init; }
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

public sealed record JellyfinPublicUser
{
    public required string Name { get; init; }
    public string? ServerId { get; init; }
    public string? ServerName { get; init; }
    public required string Id { get; init; }
    public string? PrimaryImageTag { get; init; }
    public bool HasPassword { get; init; }
    public bool HasConfiguredPassword { get; init; }
    public bool HasConfiguredEasyPassword { get; init; }
    public bool EnableAutoLogin { get; init; }
    public DateTime? LastLoginDate { get; init; }
    public DateTime? LastActivityDate { get; init; }
    public JellyfinUserConfiguration Configuration { get; init; } = JellyfinUserConfiguration.Default;
    public JellyfinUserPolicy Policy { get; init; } = JellyfinUserPolicy.Default;
    public double? PrimaryImageAspectRatio { get; init; }
}

public sealed record JellyfinUserConfiguration
{
    public static readonly JellyfinUserConfiguration Default = new();

    public string? AudioLanguagePreference { get; init; } = null;
    public bool PlayDefaultAudioTrack { get; init; } = true;
    public string? SubtitleLanguagePreference { get; init; } = null;
    public bool DisplayMissingEpisodes { get; init; }
    public string[] GroupedFolders { get; init; } = Array.Empty<string>();
    public string SubtitleMode { get; init; } = "Smart";
    public bool DisplayCollectionsView { get; init; }
    public bool EnableLocalPassword { get; init; }
    public string[] OrderedViews { get; init; } = Array.Empty<string>();
    public string[] LatestItemsExcludes { get; init; } = Array.Empty<string>();
    public string[] MyMediaExcludes { get; init; } = Array.Empty<string>();
    public bool HidePlayedInLatest { get; init; } = true;
    public bool RememberAudioSelections { get; init; } = true;
    public bool RememberSubtitleSelections { get; init; } = true;
    public bool EnableNextEpisodeAutoPlay { get; init; } = true;
    public string? CastReceiverId { get; init; } = null;
}

public sealed record JellyfinUserPolicy
{
    public static readonly JellyfinUserPolicy Default = new();

    public bool IsAdministrator { get; init; }
    public bool IsHidden { get; init; }
    public bool EnableCollectionManagement { get; init; }
    public bool EnableSubtitleManagement { get; init; }
    public bool EnableLyricManagement { get; init; }
    public bool IsDisabled { get; init; }
    public int? MaxParentalRating { get; init; }
    public int? MaxParentalSubRating { get; init; }
    public string[] BlockedTags { get; init; } = Array.Empty<string>();
    public string[] AllowedTags { get; init; } = Array.Empty<string>();
    public bool EnableUserPreferenceAccess { get; init; } = true;
    public JellyfinAccessSchedule[] AccessSchedules { get; init; } = Array.Empty<JellyfinAccessSchedule>();
    public string[] BlockUnratedItems { get; init; } = Array.Empty<string>();
    public bool EnableRemoteControlOfOtherUsers { get; init; }
    public bool EnableSharedDeviceControl { get; init; } = true;
    public bool EnableRemoteAccess { get; init; } = true;
    public bool EnableLiveTvManagement { get; init; }
    public bool EnableLiveTvAccess { get; init; }
    public bool EnableMediaPlayback { get; init; } = true;
    public bool EnableAudioPlaybackTranscoding { get; init; } = true;
    public bool EnableVideoPlaybackTranscoding { get; init; } = true;
    public bool EnablePlaybackRemuxing { get; init; } = true;
    public bool ForceRemoteSourceTranscoding { get; init; }
    public bool EnableContentDeletion { get; init; }
    public string[] EnableContentDeletionFromFolders { get; init; } = Array.Empty<string>();
    public bool EnableContentDownloading { get; init; } = true;
    public bool EnableSyncTranscoding { get; init; } = true;
    public bool EnableMediaConversion { get; init; } = true;
    public string[] EnabledDevices { get; init; } = Array.Empty<string>();
    public bool EnableAllDevices { get; init; } = true;
    public string[] EnabledChannels { get; init; } = Array.Empty<string>();
    public bool EnableAllChannels { get; init; } = true;
    public string[] EnabledFolders { get; init; } = Array.Empty<string>();
    public bool EnableAllFolders { get; init; } = true;
    public int InvalidLoginAttemptCount { get; init; }
    public int LoginAttemptsBeforeLockout { get; init; } = -1;
    public int MaxActiveSessions { get; init; }
    public bool EnablePublicSharing { get; init; } = true;
    public string[] BlockedMediaFolders { get; init; } = Array.Empty<string>();
    public string[] BlockedChannels { get; init; } = Array.Empty<string>();
    public int RemoteClientBitrateLimit { get; init; }
    public string AuthenticationProviderId { get; init; } = "Local";
    public string PasswordResetProviderId { get; init; } = "Local";
    public string SyncPlayAccess { get; init; } = "CreateAndJoinGroups";
}

public sealed record JellyfinAccessSchedule
{
    public string DayOfWeek { get; init; } = "Sunday";
    public string Start { get; init; } = "00:00";
    public string End { get; init; } = "23:59";
}

public sealed record JellyfinPlayState
{
    public long PositionTicks { get; init; }
    public bool CanSeek { get; init; }
    public bool IsPaused { get; init; }
    public bool IsMuted { get; init; }
    public int VolumeLevel { get; init; } = 100;
    public int? AudioStreamIndex { get; init; }
    public int? SubtitleStreamIndex { get; init; }
    public string? MediaSourceId { get; init; }
    public string PlayMethod { get; init; } = "DirectPlay";
    public string RepeatMode { get; init; } = "RepeatNone";
    public string PlaybackOrder { get; init; } = "Default";
}

public sealed record JellyfinBaseItemDto
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public string? OriginalTitle { get; init; }
    public string? ServerId { get; init; }
    public string? Type { get; init; }
    public string? MediaType { get; init; }
}
