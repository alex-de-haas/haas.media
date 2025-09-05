# Metadata API

Provide metadata (title, description, poster, people, etc.) for movies.

## External Packages

For getting metadata use `TMDbLib` nuget package.

## Models

### Request Models

- Create library

```csharp
public class CreateLibraryRequest
{
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}
```

- Update library

```csharp
public class UpdateLibraryRequest
{
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}
```

- Add movie or tv show to library

```csharp
public class AddToLibraryRequest
{
    public required LibraryType Type { get; set; }
    public required string LibraryId { get; set; }
    public required string TmdbId { get; set; }
}
```

### Search

- Search movies or tv shows for adding to library.

```csharp
public class SearchResult
{
    public string Title { get; set; }
    public required string OriginalTitle { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }
}
```

## Database models

### Libraries

```csharp
public enum LibraryType
{
    Movies = 1,
    TVShows = 2,
}

public class LibraryInfo
{
    public string? Id { get; set; }                    // MongoDB ObjectId
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; } // Path to directory with media files
    public required string Title { get; set; }
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }           // UTC timestamp when created
    public DateTime UpdatedAt { get; set; }           // UTC timestamp when last updated
}
```

### Cast and Crew

```csharp
public class CrewMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Job { get; set; }
    public required string Department { get; set; }
    public string? ProfilePath { get; set; }
}

public class CastMember
{
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string Character { get; set; }
    public required int Order { get; set; }
    public string? ProfilePath { get; set; }
}
```

### Movies

```csharp
public class MovieMetadata
{
    public string Id { get; set; } // Local database ID

    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public required string[] Genres { get; set; }
    public required CrewMember[] Crew { get; set; }
    public required CastMember[] Cast { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // Library and file relation if movie file exists in library
    public string? LibraryId { get; set; }
    public string? FilePath { get; set; }
}
```

### TV Shows

```csharp
public class TVShowMetadata
{
    public string Id { get; set; } // Local database ID

    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required string[] Genres { get; set; }
    public required CrewMember[] Crew { get; set; }
    public required CastMember[] Cast { get; set; }
    public required TVSeasonMetadata[] Seasons { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
    public string? BackdropPath { get; set; }

    // Library relation if tv show exists in library
    public string? LibraryId { get; set; }
}

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required TVEpisodeMetadata[] Episodes { get; set; }

    // TMDB image paths (relative paths)
    public string? PosterPath { get; set; }
}

public class TVEpisodeMetadata
{
    public required int SeasonNumber { get; set; }
    public required int EpisodeNumber { get; set; }
    public required string Name { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }

    // File relation if tv show episode file exists in library
    public string? FilePath { get; set; }
}
```

## Endpoints

### Libraries

- GET `api/metadata/libraries` - get list of all libraries
- GET `api/metadata/libraries/{id}` - get library by id
- POST `api/metadata/libraries` - add new library
- PUT `api/metadata/libraries/{id}` - update existing library
- DELETE `api/metadata/libraries/{id}` - delete library

### Metadata

- POST `api/metadata/scan` - scan all libraries for metadata using search in `TMDbLib`. Default language "en". Includes poster and backdrop images from TMDB.
- GET `api/metadata/movies` - get all movie metadata (optionally filtered by libraryId)
- GET `api/metadata/movies/{id}` - get specific movie metadata by id
- GET `api/metadata/tvshows` - get all TV show metadata (optionally filtered by libraryId)
- GET `api/metadata/tvshows/{id}` - get specific TV show metadata by id

## Storage

Libraries are stored in MongoDB in the `libraries` collection with the following features:
- Unique index on `DirectoryPath` to prevent duplicate library paths
- Index on `Title` for efficient searching
- Automatic timestamp management for creation and updates

## Image URLs

The `PosterPath` and `BackdropPath` properties contain relative paths from TMDB. To get the full image URLs, use the provided helper methods:

### Static Helper Methods
```csharp
// Get full poster URL (w500 size)
var posterUrl = MetadataService.GetPosterUrl(movie.PosterPath);

// Get full backdrop URL (w1280 size)
var backdropUrl = MetadataService.GetBackdropUrl(movie.BackdropPath);
```

### Extension Methods
```csharp
// For movies
var posterUrl = movie.GetPosterUrl();
var backdropUrl = movie.GetBackdropUrl();

// For TV shows
var posterUrl = tvShow.GetPosterUrl();
var backdropUrl = tvShow.GetBackdropUrl();
```

### Image Sizes
- **Posters**: w500 (500px width) - suitable for most UI components
- **Backdrops**: w1280 (1280px width) - suitable for hero images and backgrounds

### Example URLs
- Poster: `https://image.tmdb.org/t/p/w500/rktDFPbfHfUbArZ6OOOKsXcv0Bm.jpg`
- Backdrop: `https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg`

## Authentication

All endpoints require authorization using the configured Auth0 JWT tokens.