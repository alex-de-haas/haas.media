# Search Modal Implementation

## Overview

Added search functionality to both Movies and TV Shows pages that allows users to search TMDB for content and add selected results to their libraries.

## Backend Changes

### SearchResult Model Enhancement

- **File**: `src/Haas.Media.Downloader.Api/Metadata/Models/SearchResult.cs`
- **Changes**: Added `TmdbId` and `Type` properties to support frontend functionality

### MetadataService Updates

- **File**: `src/Haas.Media.Downloader.Api/Metadata/MetadataService.cs`
- **Changes**: Updated `SearchAsync` method to include TMDB ID and library type in search results

## Frontend Changes

### New Components

#### SearchModal Component

- **File**: `src/Haas.Media.Web/components/modals/search-modal.tsx`
- **Features**:
  - Search TMDB for movies or TV shows
  - Filter by media type (Movies/TV Shows)
  - Select target library from available libraries
  - Add selected items to library
  - Responsive design with dark mode support
  - Keyboard navigation (Enter to search, ESC to close)
  - Click outside to close functionality
  - Loading states and error handling

### Updated Pages

#### Movies Page

- **File**: `src/Haas.Media.Web/app/movies/page.tsx`
- **Changes**:
  - Added "Add Movie" button
  - Integrated SearchModal for movie searches
  - Converted to client component to support state management

#### TV Shows Page

- **File**: `src/Haas.Media.Web/app/tvshows/page.tsx`
- **Changes**:
  - Added "Add TV Show" button
  - Integrated SearchModal for TV show searches
  - Converted to client component to support state management

### API Client Updates

- **File**: `src/Haas.Media.Web/lib/api/metadata.ts`
- **Changes**: Added `search` method to MetadataApiClient interface and implementation

### Type Definitions

- **File**: `src/Haas.Media.Web/types/metadata.ts`
- **Changes**: Added `SearchResult` interface with proper TypeScript typing

## Features

### Search Functionality

- Search TMDB database for movies and TV shows
- Real-time search with debouncing
- Filter results by media type
- Display search results with posters, ratings, and descriptions

### Library Integration

- Automatic library detection based on media type
- Smart library selection (auto-select if only one available)
- Add search results directly to selected library
- Success feedback and error handling

### User Experience

- Responsive modal design
- Dark mode support
- Keyboard accessibility (Enter, ESC)
- Click outside to close
- Loading states and error messages
- Professional UI with Tailwind CSS

### Accessibility

- Proper ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader friendly

## Usage

1. Navigate to Movies or TV Shows page
2. Click "Add Movie" or "Add TV Show" button
3. Select target library (if multiple exist)
4. Enter search query and press Enter or click Search
5. Browse results and click "Add to Library" on desired items
6. Modal closes automatically on successful addition

## Technical Implementation

- Uses existing TMDB integration via backend API
- Leverages current authentication and authorization system
- Follows project patterns for component structure and styling
- Maintains type safety with TypeScript
- Responsive design using Tailwind CSS utilities
- Error handling and loading states throughout
