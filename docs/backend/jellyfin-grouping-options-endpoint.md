# Jellyfin GroupingOptions Endpoint Implementation

## Issue

Infuse was showing an error when trying to call:
```
GET /jellyfin/Users/{userId}/GroupingOptions
```

This endpoint was not implemented, causing a 404 error.

## What is GroupingOptions?

The `GroupingOptions` endpoint returns special view options that allow users to view/group their library content in different ways. Common grouping options in Jellyfin include:
- By Folder
- By Genre
- By Studio
- By Year
- Collections
- Favorites

These options appear in the client UI to help users browse their libraries in different organizational views.

## Implementation

Added a new endpoint that returns an empty array:

```csharp
group.MapGet(
    "/Users/{userId}/GroupingOptions",
    async (HttpContext context, string userId, JellyfinAuthService authService, ILogger<JellyfinService> logger) =>
        await RequireAuthenticatedAsync(
            context,
            authService,
            user =>
            {
                if (!string.Equals(user.Id, userId, StringComparison.OrdinalIgnoreCase))
                {
                    return Task.FromResult<IResult>(Results.Forbid());
                }

                // Return empty array - grouping options not implemented yet
                var groupingOptions = Array.Empty<object>();
                LogResponse(logger, $"Users/{userId}/GroupingOptions", groupingOptions);
                return Task.FromResult<IResult>(JellyfinJson(groupingOptions));
            }
        )
)
.WithName("JellyfinGroupingOptions");
```

## Response Format

Per the Jellyfin OpenAPI spec, the endpoint returns an array of `SpecialViewOptionDto`:

```typescript
interface SpecialViewOptionDto {
  Name?: string;   // View option name (e.g., "By Genre")
  Id?: string;     // View option ID
}
```

**Current implementation returns:**
```json
[]
```

This empty array indicates no special grouping options are available, which is acceptable for basic library browsing.

## Future Enhancement

To implement actual grouping options, we would:

1. Define the `SpecialViewOptionDto` model in `JellyfinModels.cs`:
```csharp
public sealed record JellyfinSpecialViewOption
{
    public string? Name { get; init; }
    public string? Id { get; init; }
}
```

2. Return standard grouping options:
```csharp
var groupingOptions = new[]
{
    new JellyfinSpecialViewOption { Name = "Folders", Id = "folders" },
    new JellyfinSpecialViewOption { Name = "Genres", Id = "genres" },
    new JellyfinSpecialViewOption { Name = "Latest", Id = "latest" }
};
```

3. Implement the filtering logic in the Items endpoints to support these groupings

## Impact

- ✅ Infuse can now successfully complete the connection flow
- ✅ No errors on the GroupingOptions request
- ✅ Clients will see default view only (no special grouping options in UI)
- ⚠️ Advanced grouping features not available until implemented

## Files Changed

- `src/Haas.Media.Downloader.Api/Jellyfin/JellyfinConfiguration.cs` - Added endpoint
- `docs/backend/jellyfin-compatibility.md` - Updated endpoint list

## Testing

After this change, the endpoint returns:

**Request:**
```http
GET /jellyfin/Users/{userId}/GroupingOptions
Authorization: Bearer <token>
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

[]
```

This allows Infuse to continue the connection process without errors.
