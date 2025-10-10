# Theatrical Release Date Feature

## Overview

Added support for extracting and displaying theatrical release dates from TMDb's release dates API. This provides more accurate release date information by distinguishing between theatrical and digital releases.

## Changes Made

### Backend

#### 1. MovieReleaseDateHelper.cs

- Added `GetTheatricalReleaseDate()` method
- Extracts theatrical release dates from TMDb's ReleaseDates API
- Supports both `ReleaseDateType.Theatrical` and `ReleaseDateType.TheatricalLimited`
- Prefers US releases, falls back to other countries if not available
- Returns the earliest theatrical release date

#### 2. MovieMetadata.cs

- Added `TheatricalReleaseDate` property (nullable DateTime)
- Updated `Create()` mapper to populate theatrical release date
- Updated `Update()` mapper to refresh theatrical release date during metadata refresh

### Frontend

#### 1. types/metadata.ts

- Added `theatricalReleaseDate?: string | null` to `MovieMetadata` interface

#### 2. movie-details.tsx

- Added `theatricalReleaseDate` computed property using `useMemo`
- Display theatrical release date in the movie details card
- Shows separately from the general release date

#### 3. digital-release-calendar.tsx

- Updated to prefer `theatricalReleaseDate` over `releaseDate`
- Falls back to `releaseDate` if `theatricalReleaseDate` is not available
- Calendar now shows accurate theatrical release dates from TMDb

### Documentation

#### metadata.md

- Updated `MovieMetadata` documentation to include `TheatricalReleaseDate` field

## Release Date Fields Explained

The `MovieMetadata` model now has three date-related fields:

1. **ReleaseDate** - General release date from TMDb (may not be theatrical)
2. **TheatricalReleaseDate** - Specific theatrical release date extracted from TMDb's ReleaseDates API
3. **DigitalReleaseDate** - Digital release date extracted from TMDb's ReleaseDates API

## TMDb Release Date Types

The helper uses TMDb's `ReleaseDateType` enum:

- `Premiere = 1` - World premiere
- `TheatricalLimited = 2` - Limited theatrical release
- `Theatrical = 3` - Wide theatrical release
- `Digital = 4` - Digital/streaming release
- `Physical = 5` - Physical media release
- `TV = 6` - TV premiere

## User Experience

### Movie Details Page

Shows three separate date fields when available:

- Release Date (general)
- Theatrical Release Date (specific theatrical release)
- Digital Release Date (streaming/digital release)

### Release Calendar

- Displays both theatrical and digital releases on the calendar
- Theatrical releases shown with blue indicator
- Digital releases shown with purple indicator
- Each movie can have up to two entries on the calendar (theatrical + digital)

## Data Consistency

When metadata is scanned or refreshed:

1. TMDb movie details are fetched with `ReleaseDates` extra method
2. `GetTheatricalReleaseDate()` extracts the theatrical date
3. `GetDigitalReleaseDate()` extracts the digital date
4. Both dates are stored in the database
5. Frontend displays dates based on availability

## Future Enhancements

Potential improvements:

- Support country-specific release dates (currently defaults to US)
- Add configuration to specify preferred country code
- Display all available release dates by country
- Add filtering options in the calendar by release type
