# Metadata API

Provide metadata (title, description, poster, people, etc.) for movies.

## External Packages

For getting metadata use `TMDbLib` nuget package.

## Models

### LibraryType

```csharp
public enum LibraryType
{
    Movies = 1,
    TVShows = 2,
}
```

### LibraryInfo

```csharp
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

### Request Models

```csharp
public class CreateLibraryRequest
{
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}

public class UpdateLibraryRequest
{
    public LibraryType Type { get; set; }
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}
```

## Database models

### Movies

```csharp
public class MovieMetadata
{
    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public DateTime? ReleaseDate { get; set; }

    public required string LibraryId { get; set; }
    public required string FilePath { get; set; }
}
```

### TV Shows

```csharp
public class TVShowMetadata
{
    public required int TmdbId { get; set; }
    public required string OriginalTitle { get; set; }
    public required string OriginalLanguage { get; set; }
    public required string Title { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required int VoteCount { get; set; }
    public required TVSeasonMetadata[] Seasons { get; set; }

    public required string LibraryId { get; set; }
}

public class TVSeasonMetadata
{
    public required int SeasonNumber { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }
    public required TVEpisodeMetadata[] Episodes { get; set; }

    public required string DirectoryPath { get; set; }
}

public class TVEpisodeMetadata
{
    public required int SeasonNumber { get; set; }
    public required int EpisodeNumber { get; set; }
    public required string Name { get; set; }
    public required string Overview { get; set; }
    public required double VoteAverage { get; set; }

    public required string FilePath { get; set; }
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

- POST `api/metadata/scan` - scan all libraries for metadata using search in `TMDbLib`. Default language "en".

## Storage

Libraries are stored in MongoDB in the `libraries` collection with the following features:
- Unique index on `DirectoryPath` to prevent duplicate library paths
- Index on `Title` for efficient searching
- Automatic timestamp management for creation and updates

## Authentication

All endpoints require authorization using the configured Auth0 JWT tokens.