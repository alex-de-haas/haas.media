# Infuse Setup Guide for Haas.Media

This guide explains how to connect Infuse (iOS/tvOS/macOS) to your Haas.Media server using the Jellyfin compatibility layer.

## Prerequisites

1. **Haas.Media service running** - The downloader API must be accessible at `http://localhost:8000` or your network IP
2. **User account created** - You need valid credentials in the Haas.Media local authentication system
3. **Network connectivity** - For remote access, ensure your device can reach the server IP

## Quick Start

### 1. Your Connection Details

**For local/same machine access:**
- **Server Address:** `http://localhost:8000/jellyfin`
- **Username:** `ascetic`
- **Password:** `17081987`

**For network/remote access (iPhone, iPad, Apple TV):**
- **Server Address:** `http://192.168.50.82:8000/jellyfin`
- **Username:** `ascetic`
- **Password:** `17081987`

### 2. Connect Infuse to Haas.Media

1. Open **Infuse** on your device
2. Tap **Settings** > **Add Files** (or the **+** button)
3. Choose **Jellyfin**
4. Enter connection details:
   - **Name:** `Haas.Media` (or any friendly name)
   - **Server:** `http://192.168.50.82:8000/jellyfin` (use your actual IP)
   - **Username:** `ascetic`
   - **Password:** `17081987`
5. Tap **Save**

### 3. Verify Connection

After saving, Infuse will:
1. Call `/jellyfin/System/Info/Public` to verify the server
2. Authenticate via `/jellyfin/Users/AuthenticateByName`
3. Fetch libraries from `/jellyfin/Users/{userId}/Views`
4. Start syncing metadata and artwork

Your Movies and TV Shows libraries should appear in Infuse within a few moments.

## Troubleshooting

### Cannot Connect / Server Not Found

**Check service is running:**
```bash
curl http://localhost:8000/jellyfin/System/Info/Public
```

Expected response:
```json
{
  "id": "DFBC2078CD06B02E",
  "serverName": "Haas.Media",
  "productName": "Haas.Media Jellyfin Bridge",
  "version": "1.0.0.0",
  "operatingSystem": "Darwin ...",
  "startupWizardCompleted": true
}
```

**If this fails:**
- Ensure Aspire/downloader-api is running: `dotnet run --project src/Haas.Media.Aspire`
- Check port 8000 is not blocked by firewall

### Authentication Failed / Invalid Credentials

**Test authentication manually:**
```bash
curl -X POST http://localhost:8000/jellyfin/Users/AuthenticateByName \
  -H "Content-Type: application/json" \
  -d '{"Username":"ascetic","Pw":"17081987"}'
```

Expected response includes `accessToken`, `user`, and `sessionInfo`.

**If this fails with 401 Unauthorized:**
- Verify username and password are correct
- Check the user exists in your LiteDB database at `{DATA_DIRECTORY}/.db/common.db`
- Ensure `JWT_SECRET` is configured in `.env` file

### No Libraries / Empty Content

**Verify libraries exist:**
```bash
# Get auth token first
TOKEN=$(curl -s -X POST http://localhost:8000/jellyfin/Users/AuthenticateByName \
  -H "Content-Type: application/json" \
  -d '{"Username":"ascetic","Pw":"17081987"}' | jq -r .accessToken)

# List libraries
curl -H "X-Emby-Token: $TOKEN" \
  http://localhost:8000/jellyfin/Library/MediaFolders
```

**If no libraries returned:**
- Ensure you have scanned media via the Haas.Media frontend
- Check `DATA_DIRECTORY` points to the correct path with Movies/Shows folders
- Verify metadata scanning has completed

### Video Won't Play / Playback Issues

**Check video streaming endpoint:**
```bash
# Replace {movieId} with actual movie ID like "movie-603"
curl -I "http://localhost:8000/jellyfin/Videos/{movieId}/stream?api_key=$TOKEN"
```

**Common issues:**
- **Codec not supported:** Infuse may request transcoding - ensure FFmpeg is configured
- **File not found:** Verify the file exists in `DATA_DIRECTORY`
- **Network buffering:** Use local IP instead of localhost for better performance

### Infuse Shows "Jellyfin Server Too Old"

This shouldn't happen with current implementation, but if it does:
- Ensure you're using the latest version of Haas.Media
- Check `/jellyfin/System/Info/Public` returns valid version information
- Try removing and re-adding the connection in Infuse

## Environment Configuration

Your `.env` file must include these settings for Jellyfin compatibility:

```env
# JWT authentication (required)
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-long
JWT_ISSUER=haas-media-local
JWT_AUDIENCE=haas-media-api
JWT_EXPIRATION_MINUTES=1440

# Data directory (required)
DATA_DIRECTORY=/path/to/your/media

# FFmpeg for transcoding (required for playback)
FFMPEG_BINARY=/usr/bin/ffmpeg

# TMDb for metadata (optional but recommended)
TMDB_API_KEY=your-tmdb-api-key
```

## Network Access Setup

### Making Service Accessible on Local Network

By default, Aspire binds to `localhost` only. To access from other devices:

1. **Update AppHost.cs** (if needed) to bind to `0.0.0.0` or specific IP
2. **Configure firewall** to allow port 8000:
   ```bash
   # macOS
   sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /path/to/dotnet
   ```

3. **Use your machine's IP** in Infuse settings instead of `localhost`

### Finding Your IP Address

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Should show something like: inet 192.168.50.82
```

## Advanced Configuration

### Custom Port

If port 8000 conflicts, update `.env`:
```env
API_PORT=9000  # Use your preferred port
```

Then update Aspire configuration to use this port.

### HTTPS/TLS

For secure connections (recommended for remote access):
1. Set up reverse proxy (nginx, Caddy, Traefik)
2. Configure SSL certificate
3. Update Infuse with `https://` URL

### Multiple Users

Create additional users via Haas.Media frontend, then use those credentials in Infuse. Each user gets their own JWT token and session.

## Features & Limitations

### ✅ Working Features
- Authentication via Jellyfin protocol
- Library browsing (Movies, TV Shows)
- Video streaming (direct play)
- Video transcoding (on-the-fly with FFmpeg)
- Metadata from TMDb (titles, descriptions, cast)
- Poster and backdrop images
- Season/episode navigation

### ⚠️ Current Limitations
- Codec detection is placeholder-based (ffprobe not yet integrated)
- Watch progress/resume not persisted
- No user ratings or favorites sync
- Limited search (LiteDB only, no live TMDb search)

## Support

For issues or questions:
1. Check Aspire dashboard logs at `http://localhost:18888`
2. Review API logs in terminal running downloader-api
3. Test endpoints manually with curl commands above
4. File an issue in the repository if problem persists

## See Also

- [Jellyfin Compatibility Layer](../backend/jellyfin-compatibility.md) - Technical implementation details
- [Video Streaming Guide](../backend/ffmpeg-video-streaming.md) - Streaming and transcoding configuration
- [Local Authentication](../backend/local-auth-complete-guide.md) - User management
