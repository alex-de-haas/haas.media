# Jellyfin API Documentation Index

Complete documentation for the Jellyfin compatibility layer in Haas.Media.

## 📚 Documentation Files

### Core Documentation

- **[jellyfin-compatibility.md](./jellyfin-compatibility.md)** - Complete API reference with all endpoints, token handling, streaming behavior, and limitations
- **[jellyfin-api-endpoint-map.md](./jellyfin-api-endpoint-map.md)** - Visual endpoint map with request flows and quick reference tables
- **[jellyfin-api-quick-reference.md](./jellyfin-api-quick-reference.md)** - Developer quick start guide with common patterns and examples

### Change Documentation

- **[jellyfin-api-infuse-enhancements.md](./jellyfin-api-infuse-enhancements.md)** - Detailed changelog of Infuse compatibility improvements
- **[JELLYFIN-INFUSE-UPDATE-SUMMARY.md](./JELLYFIN-INFUSE-UPDATE-SUMMARY.md)** - Executive summary of recent updates

### Reference

- **[/docs/jellyfin-openapi-stable.json](../jellyfin-openapi-stable.json)** - Official Jellyfin 10.11.0 OpenAPI specification

## 🚀 Quick Start

### For API Users (e.g., Infuse)

1. **Connect to server:** `http://localhost:8000/jellyfin`
2. **Authenticate:** POST to `/Users/AuthenticateByName`
3. **Browse libraries:** GET `/Library/MediaFolders`
4. **Stream content:** GET `/Videos/{id}/stream?static=true`

See [quick reference](./jellyfin-api-quick-reference.md) for detailed examples.

### For Developers

1. **Read the compatibility guide:** [jellyfin-compatibility.md](./jellyfin-compatibility.md)
2. **Check the endpoint map:** [jellyfin-api-endpoint-map.md](./jellyfin-api-endpoint-map.md)
3. **Review implementation:** `src/Haas.Media.Downloader.Api/Jellyfin/`

## 📖 What to Read First

**Using Infuse/Kodi/Similar Client?**
→ Start with [jellyfin-api-quick-reference.md](./jellyfin-api-quick-reference.md)

**Implementing a new client?**
→ Start with [jellyfin-compatibility.md](./jellyfin-compatibility.md)

**Debugging playback issues?**
→ Check [jellyfin-api-endpoint-map.md](./jellyfin-api-endpoint-map.md) for request flows

**Contributing to the Jellyfin layer?**
→ Read [jellyfin-api-infuse-enhancements.md](./jellyfin-api-infuse-enhancements.md) for current state

## 🎯 Key Features

### ✅ Supported

- Authentication with JWT tokens
- Library browsing (Movies, TV Shows)
- Metadata display (titles, descriptions, posters)
- Direct play streaming with seeking
- Transcoding with quality presets
- Season/Episode hierarchy
- Recently added content
- Image proxying from TMDb

### 🚧 Planned

- Playback position tracking (resume/continue watching)
- Watched/unwatched state
- FFprobe metadata extraction
- Advanced search filters
- Client-specific transcoding profiles

## 🔗 Related Documentation

### Backend

- [video-streaming-optimization.md](./video-streaming-optimization.md) - Streaming implementation details
- [metadata.md](./metadata.md) - Metadata scanning and storage
- [local-auth-complete-guide.md](./local-auth-complete-guide.md) - Authentication system

### Frontend

- [video-player.md](../frontend/video-player.md) - Video player implementation
- [AUTHENTICATION-COMPLETE-GUIDE.md](../frontend/AUTHENTICATION-COMPLETE-GUIDE.md) - Frontend auth

### Infrastructure

- [background-tasks.md](../infrastructure/background-tasks.md) - Task system for encoding
- [hardware-encoding.md](../infrastructure/hardware-encoding.md) - Hardware acceleration

## 📊 API Statistics

- **Total Endpoints:** 23
- **Authentication Methods:** 5 (Bearer, X-Emby-Token, Query param, etc.)
- **Supported Item Types:** 5 (Library, Movie, Series, Season, Episode)
- **Image Types:** 2 (Primary, Backdrop)
- **Streaming Modes:** 3 (Direct play, Transcoded, Container-specific)

## 🛠️ Implementation Details

### Files

```
src/Haas.Media.Downloader.Api/Jellyfin/
├── JellyfinConfiguration.cs    # Endpoint definitions
├── JellyfinModels.cs           # Data models
├── JellyfinService.cs          # Business logic
├── JellyfinAuthService.cs      # Authentication
└── JellyfinIdHelper.cs         # ID encoding/decoding
```

### Key Classes

- `JellyfinConfiguration` - Endpoint registration
- `JellyfinService` - Item resolution and library management
- `JellyfinAuthService` - Token validation and user management
- `JellyfinMediaSource` - Media source with codec information
- `JellyfinMediaStream` - Stream details (video/audio/subtitle)

## 🧪 Testing

### Manual Testing with Infuse

1. Start API: `dotnet run --project src/Haas.Media.Aspire`
2. Open Infuse, add server: `http://localhost:8000/jellyfin`
3. Login with local credentials
4. Verify libraries, browsing, and playback

### Automated Testing

```bash
# Run all tests
dotnet test

# Run API tests
dotnet test src/Haas.Media.Downloader.Api.Tests/
```

## 🐛 Troubleshooting

### Common Issues

**Can't connect from Infuse**

- Check API is running: `curl http://localhost:8000/jellyfin/System/Ping`
- Verify network connectivity
- Check firewall settings

**Authentication fails**

- Verify credentials in local authentication store
- Check JWT_SECRET is configured in .env
- Review API logs for error messages

**No content in libraries**

- Run metadata scan first
- Verify DATA_DIRECTORY is configured
- Check file permissions

**Playback doesn't work**

- Verify file paths are correct
- Check FFmpeg is installed (for transcoding)
- Try direct play: `?static=true`
- Review stream request logs

**Images don't load**

- Check TMDB_API_KEY is configured
- Verify metadata scan completed
- Check network access to image.tmdb.org

## 📝 Contributing

When enhancing the Jellyfin layer:

1. Reference the [OpenAPI spec](../jellyfin-openapi-stable.json)
2. Add new endpoints in `JellyfinConfiguration.cs`
3. Update models in `JellyfinModels.cs` if needed
4. Add business logic to `JellyfinService.cs`
5. Update documentation (especially `jellyfin-compatibility.md`)
6. Test with Infuse or other Jellyfin client
7. Document changes in a new summary file

## 🔄 Version History

- **October 2025** - Enhanced for Infuse compatibility (5 new endpoints, enhanced MediaSource/MediaStream models)
- **Earlier** - Initial Jellyfin compatibility layer

## 📮 Support

For issues or questions:

- Check troubleshooting section above
- Review [jellyfin-compatibility.md](./jellyfin-compatibility.md) limitations
- Check API logs for detailed error messages
- Refer to [OpenAPI spec](../jellyfin-openapi-stable.json) for endpoint details

---

**Last Updated:** October 10, 2025  
**Jellyfin Spec Version:** 10.11.0  
**Status:** Production Ready ✅
