# Add to Library Endpoint Test

This endpoint allows adding movies or TV shows to a library by providing their TMDB ID.

## Usage Example

```javascript
// Add a movie to library
const response = await fetch('/api/metadata/add-to-library', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 1,           // LibraryType.Movies
    libraryId: "lib123", 
    tmdbId: "550"      // Fight Club TMDB ID
  })
});

// Add a TV show to library
const response = await fetch('/api/metadata/add-to-library', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    type: 2,           // LibraryType.TVShows
    libraryId: "lib456", 
    tmdbId: "1399"     // Game of Thrones TMDB ID
  })
});
```

## Using the React Hook

```typescript
import { useAddToLibrary } from '@/features/media/hooks';
import { LibraryType } from '@/types/library';

function AddToLibraryComponent() {
  const { addToLibrary, loading, error } = useAddToLibrary();

  const handleAddMovie = async () => {
    try {
      const result = await addToLibrary({
        type: LibraryType.Movies,
        libraryId: "my-library-id",
        tmdbId: "550" // Fight Club
      });
      console.log('Added movie:', result);
    } catch (err) {
      console.error('Failed to add movie:', err);
    }
  };

  return (
    <button 
      onClick={handleAddMovie} 
      disabled={loading}
    >
      {loading ? 'Adding...' : 'Add Fight Club to Library'}
    </button>
  );
}
```

## Features

- ✅ Validates library exists and type matches
- ✅ Prevents duplicate entries in the same library
- ✅ Fetches full metadata from TMDB
- ✅ Creates movie/TV show metadata without requiring files
- ✅ Supports both movies and TV shows
- ✅ Returns comprehensive metadata including cast, crew, seasons (TV shows)
- ✅ Proper error handling with meaningful messages
- ✅ Authentication required
