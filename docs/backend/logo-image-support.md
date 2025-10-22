# Logo Image Support

## Overview

Added support for logo images from TMDb for both movies and TV shows. Logos are transparent PNG images that display the title/branding of the media, commonly used in media player interfaces.

## Backend Changes

### Models

**MovieMetadata** and **TVShowMetadata** models now include:

- `LogoPath` (string?, nullable) - TMDb relative path to the logo image

**SearchResult** model updated:

- Added `LogoPath` property for search results

### TMDb API Integration

Updated all metadata fetching operations to include `Images` in the API request:

**Movies:**

```csharp
MovieMethods.ReleaseDates | MovieMethods.Credits | MovieMethods.Images
```

**TV Shows:**

```csharp
TvShowMethods.Credits | TvShowMethods.Images
```

### Logo Selection Logic

Implemented `GetBestLogo()` helper method in both `MovieMetadataMapper` and `TVShowMetadataMapper`:

**Priority:**

1. User's preferred language from profile settings (e.g., `de` for German, `fr` for French)
2. English language logos (`iso_639_1 == "en"`) as fallback
3. Language-neutral logos (`iso_639_1 == null`) - universal logos without text
4. Highest voted logos (by `VoteAverage` and `VoteCount`)

**Language Code Normalization:**

- Accepts ISO 639-1 language codes (2-letter codes like "en", "de", "fr")
- Handles locale formats (e.g., "en-US" → "en")
- Falls back to English if user preference is not set

### Jellyfin Compatibility

Updated `JellyfinService` to support logo images:

1. **Image URL Generation:** Added "Logo" case to `GetImageUrlAsync()`
2. **Image Tags:** Created `BuildImageTags()` method that combines Primary (poster) and Logo tags in the ImageTags dictionary
3. **Client Support:** Jellyfin clients can now request logo images via `/Items/{itemId}/Images/Logo`

## Frontend Changes

### TypeScript Types

Updated metadata type definitions in `src/Haas.Media.Web/types/metadata.ts`:

- `MovieMetadata.logoPath?: string`
- `TVShowMetadata.logoPath?: string`
- `SearchResult.logoPath?: string`

### Helper Function

Added `getLogoUrl()` function to `src/Haas.Media.Web/lib/tmdb.ts`:

```typescript
/**
 * Gets the full URL for a TMDB logo image
 * @param logoPath The relative logo path from TMDB
 * @param size The image size (e.g., 'w92', 'w154', 'w185', 'w300', 'w500', 'original')
 * @returns Full image URL or null if path is null/empty
 */
export function getLogoUrl(logoPath?: string | null, size: string = "w300"): string | null;
```

## Usage Examples

### Frontend

```typescript
import { getLogoUrl } from "@/lib/tmdb";

// In a component
const logoUrl = getLogoUrl(movie.logoPath);
if (logoUrl) {
  return <img src={logoUrl} alt={`${movie.title} logo`} />;
}
```

### Jellyfin Clients

Logos are automatically included in Jellyfin API responses:

```json
{
  "ImageTags": {
    "Primary": "abc123...",
    "Logo": "def456..."
  }
}
```

Clients can request logos via:

```
GET /Items/{itemId}/Images/Logo
```

## TMDb Image Sizes

Available logo sizes from TMDb:

- `w45`, `w92`, `w154`, `w185`, `w300`, `w500`, `original`

Recommended default: `w300` (good balance between quality and file size)

## User Preferences

Logo selection respects the user's preferred metadata language setting:

1. **Setting Preference:** Users can configure their preferred language in their profile settings via `PreferredMetadataLanguage`
2. **Logo Selection:** The system will prioritize logos in the user's preferred language when fetching or updating metadata
3. **Fallback Chain:** If a logo in the preferred language isn't available, the system falls back to English, then universal (no language), then highest voted

**Example:**

- User prefers German (`de`)
- System will look for German logo first
- If not available, tries English logo
- If not available, uses universal logo (no text)
- Finally falls back to highest voted logo

## Data Migration

No migration required - existing metadata will not have `LogoPath` populated until:

1. New metadata is scanned
2. Existing metadata is refreshed via the refresh endpoint
3. New items are added to the library

**Note:** When refreshing existing metadata, the logo will be selected based on the current user's language preference at the time of refresh.

To populate logos for existing content, use the metadata refresh functionality.
