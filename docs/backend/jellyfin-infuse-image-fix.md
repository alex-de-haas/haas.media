# Jellyfin/Infuse Image Display Fix

## Problem

Movie cards in Infuse were not displaying images when browsing the library through the Jellyfin API compatibility layer.

## Root Cause

The `ImageTags` dictionary in `JellyfinItem` responses was incorrectly populated with full TMDB image URLs instead of short hash tags.

**Incorrect behavior:**

```json
{
  "ImageTags": {
    "Primary": "https://image.tmdb.org/t/p/original/abc123.jpg"
  }
}
```

**Expected behavior:**

```json
{
  "ImageTags": {
    "Primary": "a1b2c3d4e5f6g7h8"
  }
}
```

## How Jellyfin Image Protocol Works

1. **Item listing response** includes `ImageTags` with short hash values
2. **Client constructs URL** using the hash: `/jellyfin/Items/{itemId}/Images/Primary`
3. **Server fetches image** from TMDB and returns it directly to the client

Infuse and other Jellyfin clients expect this protocol and will not display images if given full URLs in `ImageTags`.

## Image Delivery

The `/Items/{itemId}/Images/{type}` endpoint now:

1. Receives the image request from the client
2. Fetches the image from TMDB using `HttpClient`
3. Returns the image bytes directly with the appropriate content type
4. Handles errors gracefully with proper logging

This approach provides better performance and caching opportunities compared to redirects, and keeps the TMDB integration transparent to clients.

## Solution

Modified `JellyfinService.cs` to generate short hash tags from image paths:

1. **New method `GenerateImageTag(string path)`** - Creates a consistent 16-character hash from the TMDB poster/backdrop path using SHA256
2. **Updated `BuildPrimaryImageTag()`** - Now returns hash tag instead of full URL
3. **Updated `BuildBackdropImageTag()`** - Now returns hash tag instead of full URL

The existing `/Items/{itemId}/Images/{type}` endpoint already handles the redirect correctly by calling `GetImageUrlAsync()` which returns the full TMDB URL.

## Files Modified

- `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinService.cs`
  - Modified `BuildPrimaryImageTag()` method
  - Modified `BuildBackdropImageTag()` method
  - Added `GenerateImageTag()` helper method

- `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinConfiguration.cs`
  - Modified `/Items/{itemId}/Images/{type}` endpoint
  - Changed from redirect to direct image return
  - Added TMDB image fetching via HttpClient
  - Added error handling and logging

- `src/Haas.Media.Downloader.Api/Program.cs`
  - Added `AddHttpClient()` for DI registration

## Testing

After this fix, movie cards in Infuse should display:

- Primary poster images in list views
- Backdrop images in detail views
- Season poster images
- Series poster images

The hash generation is deterministic, so the same image path will always generate the same hash, enabling proper caching by clients.
