# Jellyfin TV Show Premiere Date Fix

**Date:** October 17, 2025  
**Issue:** Infuse showing empty TV show details

## Problem

Infuse client was displaying empty details for TV shows when browsing through the Jellyfin API compatibility layer. While the JSON responses contained most metadata (overview, people, genres, etc.), they were missing **premiere date and production year** information for both Series and Season items.

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

### 1. Added FirstAirDate to TVShowMetadata Model

Updated `TVShowMetadata.cs` to capture the first air date from TMDb:

```csharp
public class TVShowMetadata
{
    // ... existing fields ...
    public string? OfficialRating { get; set; }
    public DateTime? FirstAirDate { get; set; }  // NEW
    // ... rest of fields ...
}
```

### 2. Updated Metadata Mapper

Modified both the `Create` and `Update` methods in `TVShowMetadataMapper` to populate the field:

```csharp
// In Create method
FirstAirDate = tvShow.FirstAirDate,

// In Update method
target.FirstAirDate = source.FirstAirDate;
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

### 5. Updated Frontend Types

Updated `TVShowMetadata` interface in `types/metadata.ts` to match the backend model:

```typescript
export interface TVShowMetadata {
  // ... existing fields ...
  officialRating?: string | null;
  firstAirDate?: string | null;  // NEW
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

- `src/Haas.Media.Services/Metadata/Models/TVShowMetadata.cs`
- `src/Haas.Media.Services/Jellyfin/JellyfinService.cs`
- `src/Haas.Media.Web/types/metadata.ts`

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
