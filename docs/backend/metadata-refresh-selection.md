# Metadata Refresh Selection Feature

## Overview

Added a selection dialog to the metadata refresh feature, allowing users to choose which types of metadata to refresh (Movies, TV Shows, People). This prevents unnecessary API calls and processing time when only specific metadata types need updating.

## Implementation Details

### Backend Changes

#### 1. MetadataRefreshTask.cs

Added three boolean properties to control what gets refreshed:

```csharp
public bool RefreshMovies { get; init; } = true;
public bool RefreshTvShows { get; init; } = true;
public bool RefreshPeople { get; init; } = true;
```

#### 2. MetadataRefreshTaskExecutor.cs

Updated the executor to respect the flags:

- Only loads movies from the database if `RefreshMovies` is true
- Only loads TV shows from the database if `RefreshTvShows` is true
- Skips processing for disabled types (returns empty lists)

#### 3. IMetadataApi.cs

Updated interface signature:

```csharp
Task<string> StartRefreshMetadataAsync(
    bool refreshMovies = true,
    bool refreshTvShows = true,
    bool refreshPeople = true
);
```

#### 4. MetadataService.cs

Enhanced `StartRefreshMetadataAsync()` to:

- Accept refresh options as parameters (all default to true for backward compatibility)
- Pass options to the task creation
- Log which types are being refreshed

#### 5. MetadataConfiguration.cs

Updated the API endpoint to accept a request body:

- Created `RefreshMetadataRequest` record with three boolean properties
- Modified POST `/api/metadata/refresh/start` to accept the request body
- Defaults to all true if no body is provided

### Frontend Changes

#### 1. RefreshMetadataDialog Component

**Location:** `src/Haas.Media.Web/features/libraries/components/refresh-metadata-dialog.tsx`

**Features:**

- Three checkboxes for Movies, TV Shows, and People
- All checked by default
- Validation requiring at least one selection
- Error message when no selections are made
- Disabled "Start Refresh" button when validation fails
- Uses AlertDialog for consistent UI

**Props:**

```typescript
interface RefreshMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (options: RefreshOptions) => void;
}

export interface RefreshOptions {
  refreshMovies: boolean;
  refreshTvShows: boolean;
  refreshPeople: boolean;
}
```

#### 2. useLibraries Hook

**Location:** `src/Haas.Media.Web/features/libraries/hooks/useLibraries.ts`

Updated `startMetadataRefresh()` to:

- Accept optional options parameter
- Send options as JSON body to the API
- Default to all true if no options provided

**Signature:**

```typescript
const startMetadataRefresh = async (options?: {
  refreshMovies?: boolean;
  refreshTvShows?: boolean;
  refreshPeople?: boolean
}): Promise<{ success: boolean; message: string; operationId?: string }>
```

#### 3. Libraries Page

**Location:** `src/Haas.Media.Web/app/libraries/page.tsx`

**Changes:**

- Added `isRefreshDialogOpen` state
- Modified `handleRefreshMetadata()` to open dialog instead of starting refresh directly
- Added `handleRefreshConfirm()` to handle the actual refresh with selected options
- Added `<RefreshMetadataDialog>` component to JSX

**User Flow:**

1. User clicks "Refresh Metadata" button
2. Dialog opens with three checkboxes (all checked by default)
3. User selects desired metadata types
4. User clicks "Start Refresh" (or "Cancel")
5. API call is made with selected options
6. Background task processes only the selected types

## API Contract

### Request

```
POST /api/metadata/refresh/start
Content-Type: application/json

{
  "refreshMovies": true,
  "refreshTvShows": true,
  "refreshPeople": false
}
```

### Response

```json
{
  "operationId": "task-id-guid",
  "message": "Metadata refresh task started"
}
```

## Benefits

1. **Performance:** Reduces processing time when only specific metadata needs refreshing
2. **API Efficiency:** Fewer TMDb API calls when not refreshing all types
3. **User Control:** Users can target specific metadata types for updates
4. **Backward Compatibility:** All parameters default to true, maintaining existing behavior
5. **Validation:** Prevents users from starting a refresh with nothing selected

## Testing Checklist

- [x] Backend compiles without errors
- [x] Frontend builds successfully with Next.js
- [x] TypeScript types are correct
- [ ] Dialog opens when clicking refresh button
- [ ] Validation prevents submission with no selections
- [ ] API receives correct options from frontend
- [ ] Backend only processes selected types
- [ ] Progress reports correctly for partial refreshes
- [ ] Cancel button works
- [ ] Default behavior (all true) works when no options provided

## Files Modified

### Backend (.NET)

- `src/Haas.Media.Services/Metadata/MetadataRefreshTask.cs`
- `src/Haas.Media.Services/Metadata/MetadataRefreshTaskExecutor.cs`
- `src/Haas.Media.Services/Metadata/IMetadataApi.cs`
- `src/Haas.Media.Services/Metadata/MetadataService.cs`
- `src/Haas.Media.Services/Metadata/MetadataConfiguration.cs`

### Frontend (Next.js)

- `src/Haas.Media.Web/features/libraries/components/refresh-metadata-dialog.tsx` (new)
- `src/Haas.Media.Web/features/libraries/hooks/useLibraries.ts`
- `src/Haas.Media.Web/app/libraries/page.tsx`

## Future Enhancements

1. **Remember Last Selection:** Store user's last choices in local storage
2. **Show Counts:** Display how many items will be refreshed for each type
3. **Progress Breakdown:** Show separate progress for each selected type
4. **Scheduled Refreshes:** Allow scheduling partial refreshes
5. **Smart Suggestions:** Suggest what to refresh based on recent changes
