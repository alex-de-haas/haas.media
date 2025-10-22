# Jellyfin Authentication - Infuse Compatibility Update

## Overview

Enhanced the Jellyfin authentication response (`/jellyfin/Users/AuthenticateByName`) to match the official Jellyfin API format for better compatibility with Infuse and other Jellyfin clients.

## Changes Made

### 1. Enhanced User Contract (`JellyfinUserContract`)

Added comprehensive user information fields:

- `ServerName` - Server name displayed to clients
- `HasPassword` / `HasConfiguredPassword` - Password status indicators
- `EnableAutoLogin` - Auto-login preference
- `LastLoginDate` / `LastActivityDate` - User activity timestamps
- `Configuration` - User-specific configuration (audio/subtitle preferences, views, etc.)
- `Policy` - User access policy (permissions, restrictions, etc.)
- `PrimaryImageAspectRatio` - Profile image aspect ratio

### 2. Enhanced Session Info (`JellyfinSessionInfo`)

Added session state and capabilities:

- `PlayState` - Current playback state (position, volume, audio/subtitle tracks)
- `RemoteEndPoint` - Client connection endpoint
- `PlayableMediaTypes` - Supported media types (Video, Audio)
- `LastActivityDate` / `LastPlaybackCheckIn` - Activity timestamps
- `DeviceType` - Device classification
- `NowPlayingItem` - Currently playing media item
- `IsActive` - Session active status
- `SupportsMediaControl` / `SupportsRemoteControl` - Remote control capabilities
- `HasCustomDeviceName` - Custom device name indicator
- `SupportedCommands` - Available remote commands

### 3. Added Supporting Models

**JellyfinPlayState:**

- Playback position and state tracking
- Audio/subtitle stream selection
- Play method (DirectPlay, DirectStream, Transcode)
- Repeat mode and playback order

**JellyfinBaseItemDto:**

- Basic media item information
- Used for `NowPlayingItem` in session info

### 4. Authentication Response Enhancement

Added `ServerId` field to `JellyfinAuthenticateResponse` for server identification.

## Response Structure

```json
{
  "AccessToken": "jwt-token",
  "ServerId": "unique-server-id",
  "User": {
    "Id": "user-guid",
    "Name": "username",
    "ServerId": "server-id",
    "ServerName": "Haas.Media",
    "HasPassword": true,
    "HasConfiguredPassword": true,
    "EnableAutoLogin": false,
    "LastLoginDate": "2025-10-10T12:00:00Z",
    "LastActivityDate": "2025-10-10T12:00:00Z",
    "Configuration": {
      "SubtitleMode": "Smart",
      "PlayDefaultAudioTrack": true,
      "RememberAudioSelections": true,
      "RememberSubtitleSelections": true,
      "EnableNextEpisodeAutoPlay": true,
      "HidePlayedInLatest": true
    },
    "Policy": {
      "EnableMediaPlayback": true,
      "EnableAudioPlaybackTranscoding": true,
      "EnableVideoPlaybackTranscoding": true,
      "EnablePlaybackRemuxing": true,
      "EnableContentDownloading": true,
      "EnableSyncTranscoding": true,
      "EnableMediaConversion": true,
      "EnableAllDevices": true,
      "EnableAllChannels": true,
      "EnableAllFolders": true,
      "EnableRemoteAccess": true,
      "EnableSharedDeviceControl": true,
      "EnablePublicSharing": true,
      "EnableUserPreferenceAccess": true,
      "LoginAttemptsBeforeLockout": -1,
      "AuthenticationProviderId": "Local",
      "PasswordResetProviderId": "Local",
      "SyncPlayAccess": "CreateAndJoinGroups"
    }
  },
  "SessionInfo": {
    "Id": "session-id",
    "UserId": "user-guid",
    "UserName": "username",
    "DeviceId": "device-id",
    "DeviceName": "Device Name",
    "Client": "Client Name",
    "ApplicationVersion": "1.0.0",
    "ServerId": "server-id",
    "PlayableMediaTypes": ["Video", "Audio"],
    "LastActivityDate": "2025-10-10T12:00:00Z",
    "IsActive": true,
    "SupportsMediaControl": false,
    "SupportsRemoteControl": false,
    "HasCustomDeviceName": false,
    "SupportedCommands": []
  }
}
```

## User Configuration Defaults

The default user configuration enables common playback preferences:

- **Audio/Video**: Play default audio track, remember selections
- **Subtitles**: Smart subtitle mode, remember selections
- **Playback**: Auto-play next episode enabled
- **Latest Items**: Hide played items

## User Policy Defaults

The default policy grants full media playback capabilities:

- ✅ Media playback enabled
- ✅ Audio/video transcoding enabled
- ✅ Direct play and remuxing enabled
- ✅ Content downloading enabled
- ✅ All devices, channels, and folders enabled
- ✅ Remote access and shared device control
- ✅ Public sharing enabled
- ❌ Administrative functions disabled
- ❌ Live TV management disabled
- ❌ Content deletion disabled

## Client Compatibility

This format matches the official Jellyfin API and is compatible with:

- **Infuse** (iOS/tvOS/macOS media player)
- **Jellyfin Mobile** (iOS/Android apps)
- **Jellyfin Web** (browser client)
- **Third-party Jellyfin clients**

## Implementation Details

### Service Layer

**File:** `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinAuthService.cs`

- `CreateUserContract()` - Populates full user information with defaults
- `CreateSessionInfo()` - Generates session with current state
- `AuthenticateAsync()` - Returns enhanced auth response with server ID

### Model Definitions

**File:** `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinModels.cs`

All models use C# records with init-only properties and sensible defaults from static instances:

- `JellyfinUserConfiguration.Default`
- `JellyfinUserPolicy.Default`

## Testing

To test authentication with the enhanced response:

```bash
curl -X POST http://localhost:8000/jellyfin/Users/AuthenticateByName \
  -H "Content-Type: application/json" \
  -H "X-Emby-Authorization: MediaBrowser Client=\"Test\", Device=\"TestDevice\", DeviceId=\"test-123\", Version=\"1.0.0\"" \
  -d '{
    "Username": "your-username",
    "Pw": "your-password"
  }'
```

Expected response includes all enhanced fields documented above.

## Migration Notes

**Backward Compatibility:** ✅ Fully backward compatible

Existing clients using minimal fields continue to work. Enhanced clients can now access additional user configuration and session state information.

**Breaking Changes:** None

All new fields are optional and have sensible defaults. Existing integrations are not affected.
