# Logo Display on Details Pages

## Overview

Added logo image display to movie and TV show details pages. When a logo is available from TMDb, it replaces the text title in the header section, providing a more visually appealing and branded presentation.

## Implementation

### Location

- **Movie Details:** `src/Haas.Media.Web/features/media/components/movie-details.tsx`
- **TV Show Details:** `src/Haas.Media.Web/features/media/components/tvshow-details.tsx`

### Display Logic

The logo is displayed conditionally in the header section:

```tsx
{logoUrl ? (
  <div className="mb-2">
    <Image
      src={logoUrl}
      alt={`${title} logo`}
      width={300}
      height={100}
      className="max-w-[300px] h-auto object-contain"
      priority
    />
  </div>
) : (
  <CardTitle className="text-3xl md:text-4xl">{title}</CardTitle>
)}
```

**Behavior:**
- **Logo available:** Displays the logo image above metadata (year, rating, language)
- **No logo:** Falls back to displaying the text title as before

### Logo Configuration

- **Size:** Uses `w500` size from TMDb (`getLogoUrl(logoPath, "w500")`)
- **Max Width:** Constrained to 300px to maintain reasonable size
- **Aspect Ratio:** Preserved via `object-contain`
- **Priority:** Set to `true` for faster loading (above-the-fold content)

### Visual Placement

The logo is positioned:
1. At the top of the details card header
2. Above the original title (if different from main title)
3. Above the metadata badges (year, rating, language, etc.)
4. Replaces the text title when available

## User Experience

### Benefits

1. **Visual Brand Recognition:** Logos provide instant visual recognition of media titles
2. **Professional Appearance:** Matches the look of modern streaming services
3. **Better Typography:** Logos often have better typography than plain text
4. **Language Agnostic:** Logos work across languages (especially for universal/no-text logos)

### Responsive Design

- Logos scale down on smaller screens while maintaining aspect ratio
- Maximum width ensures logos don't dominate on larger screens
- Falls back gracefully to text when logos aren't available

## Examples

### With Logo
```
┌─────────────────────────────────────┐
│  [JURASSIC PARK Logo Image]        │
│  Jurassic Park (original title)    │
│  1993 • PG-13 • EN • 127 min       │
│  ⭐ 7.8/10                          │
└─────────────────────────────────────┘
```

### Without Logo (Fallback)
```
┌─────────────────────────────────────┐
│  Jurassic Park                      │
│  Jurassic Park (original title)    │
│  1993 • PG-13 • EN • 127 min       │
│  ⭐ 7.8/10                          │
└─────────────────────────────────────┘
```

## Dependencies

- `getLogoUrl()` utility function from `@/lib/tmdb`
- `logoPath` property on `MovieMetadata` and `TVShowMetadata` types
- Next.js `Image` component for optimized image loading

## Future Enhancements

Potential improvements:
1. Add hover effects or animations
2. Support different logo sizes based on viewport
3. Add backdrop overlay with logo for hero sections
4. Support for SVG logos (currently PNGs only)
5. Dark/light mode logo variants

## Related Documentation

- [Logo Image Support](../backend/logo-image-support.md) - Backend implementation
- [TMDb Image Utilities](../../src/Haas.Media.Web/lib/tmdb.ts) - Helper functions
