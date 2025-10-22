# Jellyfin TV Show Premiere Date Fix

**Date:** October 17, 2025  
**Issue:** Infuse showing empty TV show details

## Problem

Infuse client was displaying empty details for TV shows when browsing through the Jellyfin API compatibility layer. The root causes were:

1. **Missing premiere date and production year** - Responses were missing these fields for Series and Season items
2. **Missing Status field** - TV show status (e.g., "Returning Series", "Ended") was not included
3. **Seasons without files** - The API was returning ALL seasons from TMDb metadata, including seasons that had no actual video files, which confused Infuse's rendering logic

### Missing Fields

For both Series and Season items, the following fields were always `null`:

- `PremiereDate` - The date the show first aired
- `ProductionYear` - The year the show premiered

These fields are important for Jellyfin clients like Infuse to properly display and organize content. Without premiere dates, clients may:

- Show empty or incomplete detail screens
- Fail to sort content chronologically
- Not display year badges or release information

## Root Cause

The `TVShowMetadata` model in `Haas.Media.Services` was missing the `FirstAirDate` property from TMDb, even though the TMDbLib `TvShow` object provides this information. Consequently, the Jellyfin mapper (`JellyfinService.MapSeriesAsync` and `JellyfinService.MapSeason`) was hardcoding these fields to `null`:

```csharp
// Before
PremiereDate = null,
ProductionYear = null,
```

## Solution

### 1. Added FirstAirDate and Status to TVShowMetadata Model

Updated `TVShowMetadata.cs` to capture critical fields from TMDb:

```csharp
public class TVShowMetadata
{
    // ... existing fields ...
    public string? OfficialRating { get; set; }
    public DateTime? FirstAirDate { get; set; }  // NEW
    public string? Status { get; set; }          // NEW (e.g., "Returning Series", "Ended")
    // ... rest of fields ...
}
```

### 2. Updated Metadata Mapper

Modified both the `Create` and `Update` methods in `TVShowMetadataMapper` to populate the fields:

```csharp
// In Create method
FirstAirDate = tvShow.FirstAirDate,
Status = tvShow.Status,

// In Update method
target.FirstAirDate = source.FirstAirDate;
target.Status = source.Status;
```

### 3. Updated Jellyfin Series Mapping

Modified `MapSeriesAsync` in `JellyfinService.cs` to use the FirstAirDate:

```csharp
PremiereDate = metadata.FirstAirDate.HasValue
    ? DateTime.SpecifyKind(metadata.FirstAirDate.Value, DateTimeKind.Utc)
    : null,
ProductionYear = metadata.FirstAirDate?.Year,
```

### 4. Updated Jellyfin Season Mapping

Modified `MapSeason` in `JellyfinService.cs` to inherit premiere date from the series:

```csharp
PremiereDate = metadata.FirstAirDate.HasValue
    ? DateTime.SpecifyKind(metadata.FirstAirDate.Value, DateTimeKind.Utc)
    : null,
ProductionYear = metadata.FirstAirDate?.Year,
```

**Note:** Seasons inherit the show's premiere date since TMDb doesn't provide individual season premiere dates in the main show object. For more accurate season-specific dates, the season detail endpoint would need to be called during metadata scanning.

### 5. Added Critical Jellyfin Compatibility Fields

Added multiple fields to match real Jellyfin responses (discovered by comparing with actual Jellyfin server output):

**Status field:**

```csharp
public string? Status { get; init; }  // "Returning Series", "Ended", etc.
```

**Series reference fields for seasons:**

```csharp
public string? SeriesPrimaryImageTag { get; init; }
public double? PrimaryImageAspectRatio { get; init; }  // Standard poster ratio: 0.6666...
public string? ParentLogoItemId { get; init; }
public string? ParentLogoImageTag { get; init; }
public string? ParentThumbItemId { get; init; }
public string? ParentThumbImageTag { get; init; }
```

**UserData enhancements:**

```csharp
public int? UnplayedItemCount { get; init; }  // Important for Infuse to show episode counts
```

**Season mapping updates:**

- Set `MediaType = null` for seasons (matches Jellyfin behavior)
- Populate `SeriesName` and `SeriesId` fields
- Add `SeriesPrimaryImageTag` from parent series
- Set `PrimaryImageAspectRatio` for proper image display
- Include `UnplayedItemCount` in UserData

These fields are critical for Infuse to properly render season detail screens.

### 6. Filter Seasons and Episodes Without Files

**Critical fix:** Updated all methods that return seasons or episodes to only include items that have associated video files:

```csharp
// Added helper method
private async Task<bool> SeasonHasFilesAsync(int tvShowId, int seasonNumber)
{
    var files = await _metadataApi.GetFilesByMediaIdAsync(tvShowId, LibraryType.TVShows);
    return files.Any(f => f.SeasonNumber == seasonNumber);
}

// Updated BuildSeriesChildrenAsync
foreach (var season in show.Seasons.OrderBy(s => s.SeasonNumber))
{
    // Only include seasons that have at least one episode file
    var hasFiles = await SeasonHasFilesAsync(show.Id, season.SeasonNumber);
    if (!hasFiles)
    {
        continue; // Skip this season entirely
    }
    // ... rest of logic
}
```

**Why this matters:** TMDb provides metadata for ALL seasons of a show, but users may only have downloaded some seasons. Returning seasons without files causes:

- Infuse to show empty placeholders
- Confusion about which content is actually available
- Potential rendering issues in clients expecting playable content

**Methods updated:**

- `BuildSeriesChildrenAsync` - Filters out seasons without files
- `BuildSeasonEpisodesAsync` - Only returns episodes with files
- `MapAllEpisodesAsync` - Filters both seasons and episodes
- `MapSeriesAsync` - Counts only reflect seasons/episodes with files

### 7. Updated Frontend Types

Updated `TVShowMetadata` interface in `types/metadata.ts` to match the backend model:

```typescript
export interface TVShowMetadata {
  // ... existing fields ...
  officialRating?: string | null;
  firstAirDate?: string | null; // NEW
  status?: string | null; // NEW
  createdAt: string;
  updatedAt: string;
}
```

## Expected Results

After this fix and re-scanning metadata, Jellyfin API responses will include:

**For Series:**

```json
{
  "Id": "series-95480",
  "Name": "Slow Horses",
  "Type": "Series",
  "PremiereDate": "2022-04-01T00:00:00Z",
  "ProductionYear": 2022,
  "Status": "Returning Series",
  ...
}
```

**For Seasons:**

```json
{
  "Id": "season-95480-1",
  "Name": "Season 1",
  "Type": "Season",
  "PremiereDate": "2022-04-01T00:00:00Z",
  "ProductionYear": 2022,
  ...
}
```

**Key behavioral change:** The API now only returns seasons that contain at least one episode file. If you have metadata for all 5 seasons of a show but only downloaded Season 1, only Season 1 will appear in Jellyfin/Infuse.

This should resolve the empty detail screens in Infuse and other Jellyfin clients.

## Migration Requirements

**Important:** Existing TV show metadata in the database will not have the `FirstAirDate` field populated. Users must:

1. **Re-scan TV show metadata** to populate the new field
2. Navigate to the Metadata page in the web UI
3. Click "Scan Library" for any TV show libraries

Alternatively, delete the existing TV show metadata and perform a fresh scan.

## Testing

### Manual Testing with Infuse

1. **Rebuild and restart the application:**

   ```bash
   dotnet run --project src/Haas.Media.Aspire
   ```

2. **Re-scan TV show metadata** via the web UI or API

3. **Test in Infuse:**
   - Open Infuse app
   - Browse to TV Shows library
   - Select a TV show
   - Verify detail screen shows:
     - Show title and overview
     - Premiere year badge
     - Cast and crew information
     - Season list with years

### API Testing

Test the updated endpoints directly:

```bash
# Get series details
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/jellyfin/Items/series-95480

# Get seasons for a series
curl -H "Authorization: Bearer <token>" \
  http://localhost:8000/jellyfin/Shows/series-95480/Seasons
```

Verify the response includes `PremiereDate` and `ProductionYear` fields.

## Files Modified

- `src/Haas.Media.Services/Metadata/Models/TVShowMetadata.cs` - Added `FirstAirDate` and `Status` fields
- `src/Haas.Media.Services/Jellyfin/JellyfinService.cs` - Major changes:
  - Added `SeasonHasFilesAsync` helper method
  - Updated all season/episode listing methods to filter by file existence
  - Updated `MapSeriesAsync` to count only seasons/episodes with files
  - Populated premiere dates and status in mappings
- `src/Haas.Media.Services/Jellyfin/JellyfinModels.cs` - Added `Status` field to `JellyfinItem`
- `src/Haas.Media.Web/types/metadata.ts` - Updated TypeScript interfaces

## Future Enhancements

### Season-Specific Premiere Dates

Currently, seasons inherit the series' premiere date. For more accuracy:

1. **Fetch season details during scanning:**
   - Call TMDb `/tv/{id}/season/{season_number}` for each season
   - `TvSeason` object includes `AirDate` field

2. **Add AirDate to TVSeasonMetadata:**

   ```csharp
   public class TVSeasonMetadata
   {
       // ... existing fields ...
       public DateTime? AirDate { get; set; }
   }
   ```

3. **Use season-specific dates in Jellyfin mapping:**
   ```csharp
   PremiereDate = season?.AirDate.HasValue
       ? DateTime.SpecifyKind(season.AirDate.Value, DateTimeKind.Utc)
       : (metadata.FirstAirDate.HasValue
           ? DateTime.SpecifyKind(metadata.FirstAirDate.Value, DateTimeKind.Utc)
           : null),
   ```

This would provide accurate premiere dates for each season, particularly useful for shows with long gaps between seasons.

## Related Documentation

- [Jellyfin Compatibility Layer](jellyfin-compatibility.md)
- [Jellyfin API Endpoint Map](jellyfin-api-endpoint-map.md)
- [Metadata Scanning](metadata-scanning.md)
- [Jellyfin/Infuse Empty Dict Fix](jellyfin-infuse-empty-dict-fix.md)
