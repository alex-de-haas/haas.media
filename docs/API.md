# API

## Torrent Feature

### Endpoints

- GET `api/torrents` - returns list of uploaded torrents
- POST `api/torrents` - upload new torrent files for download
- PUT `api/torrents/{hash}/start` - start torrent download
- PUT `api/torrents/{hash}/stop` - stop torrent download
- DELETE `api/torrents/{hash}` - delete torrent file

### SignalR

- `hub/torrents` - SignalR hub for torrents updates

## Encoding Feature

### Endpoints

- GET `api/encodings` - returns list of active encodings
- GET `api/encodings/info?path={path}` - returns list of media files with media info by {path} (path to directory or file)
- POST `api/encodings` - start new encoding
- DELETE `api/encodings/{id}` - stop and delete encoding

### SignalR

- `hub/encodings` - SignalR hub for encoding updates

## Metadata Feature

### Endpoints

- GET `api/metadata/libraries` - returns list of media libraries
- GET `api/metadata/libraries/{id}` - returns specific library by ID
- POST `api/metadata/libraries` - create new media library
- PUT `api/metadata/libraries/{id}` - update existing library
- DELETE `api/metadata/libraries/{id}` - delete library
- POST `api/metadata/scan/start` - start background scan operation
- GET `api/metadata/scan/operations` - get active scan operations
- POST `api/metadata/scan/operations/{operationId}/cancel` - cancel scan operation
- GET `api/metadata/movies` - returns movie metadata (optional libraryId parameter)
- GET `api/metadata/movies/{id}` - returns specific movie metadata by ID
- GET `api/metadata/tvshows` - returns TV show metadata (optional libraryId parameter)
- GET `api/metadata/tvshows/{id}` - returns specific TV show metadata by ID
- GET `api/metadata/search?query={query}&libraryType={libraryType}` - search TMDB for movies and TV shows
- POST `api/metadata/add-to-library` - add a movie or TV show to a library by TMDB ID

#### Add to Library

POST `/api/metadata/add-to-library`

Request body:
```json
{
  "type": 1,           // LibraryType: 1 for Movies, 2 for TVShows
  "libraryId": "string", // ID of the target library
  "tmdbId": "string"     // TMDB ID of the movie or TV show
}
```

Responses:
- `200 OK`: Returns the created `MovieMetadata` or `TVShowMetadata` object
- `400 Bad Request`: Invalid request (e.g., invalid TMDB ID, library not found, library type mismatch)
- `409 Conflict`: Item already exists in the library
- `401 Unauthorized`: Authentication required

#### Search Parameters

- `query` (required): Search term for movies/TV shows
- `libraryType` (optional): Filter by library type (1 for Movies, 2 for TVShows). If not specified, searches both.

#### Search Response

Returns an array of `SearchResult` objects containing:
- `Title`: Display title
- `OriginalTitle`: Original title in source language
- `Overview`: Plot synopsis
- `VoteAverage`: TMDB rating (0-10)
- `VoteCount`: Number of votes
- `PosterPath`: Relative path to poster image (use extension methods to get full URL)
- `BackdropPath`: Relative path to backdrop image (use extension methods to get full URL)

#### Search Usage Examples

```bash
# Search for both movies and TV shows
GET /api/metadata/search?query=avengers

# Search only for movies (LibraryType.Movies = 1)
GET /api/metadata/search?query=avengers&libraryType=1

# Search only for TV shows (LibraryType.TVShows = 2)
GET /api/metadata/search?query=breaking bad&libraryType=2
```

### SignalR

- `hub/metadata` - SignalR hub for metadata scan updates
