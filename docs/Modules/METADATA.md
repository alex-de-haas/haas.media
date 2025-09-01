# Metadata API

Provide metadata (title, description, poster, people, etc.) for movies.

## External Packages

For getting metadata use `TMDbLib` nuget package.

## Models

### LibraryInfo

```csharp
public class LibraryInfo
{
    public string? Id { get; set; }                    // MongoDB ObjectId
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
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}

public class UpdateLibraryRequest
{
    public required string DirectoryPath { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
}
```

## Endpoints

- GET `api/metadata/libraries` - get list of all libraries
- GET `api/metadata/libraries/{id}` - get library by id
- POST `api/metadata/libraries` - add new library
- PUT `api/metadata/libraries/{id}` - update existing library
- DELETE `api/metadata/libraries/{id}` - delete library

## Storage

Libraries are stored in MongoDB in the `libraries` collection with the following features:
- Unique index on `DirectoryPath` to prevent duplicate library paths
- Index on `Title` for efficient searching
- Automatic timestamp management for creation and updates

## Authentication

All endpoints require authorization using the configured Auth0 JWT tokens.