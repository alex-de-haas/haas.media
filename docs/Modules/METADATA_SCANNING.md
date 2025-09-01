# Metadata Scanning Implementation

The metadata scanning functionality has been fully implemented according to the METADATA.md specification.

## Features Implemented

### 1. TMDb Integration
- Uses TMDbLib to search for movie metadata
- Respects rate limits with 250ms delays between requests
- Searches by extracted movie titles from file names

### 2. File Scanning
- Recursively scans library directories for media files
- Supports common video formats: `.mp4`, `.mkv`, `.avi`, `.mov`, `.m4v`, `.wmv`, `.flv`, `.webm`
- Extracts clean movie titles from complex file names

### 3. Smart Title Extraction
The system removes common elements from file names to extract clean movie titles:
- Year markers (2018, (2018), .2018.)
- Resolution markers (720p, 1080p, 4K, etc.)
- Quality markers (BluRay, BDRip, WEBRip, HDRip, DVDRip)
- Codec markers (x264, x265, H.264, H.265, HEVC)
- Audio codec markers (AAC, AC3, DTS)
- Language markers (.rus.)
- Release group markers (LostFilm.TV)
- TV series markers (S01E01)

### 4. Database Storage
- Stores movie metadata in MongoDB `movieMetadata` collection
- Prevents duplicate entries by checking existing file paths
- Creates indexes for efficient querying

### 5. API Endpoints

#### Scan Libraries
```
POST /api/metadata/scan
```
Scans all libraries and fetches metadata for found movies.

#### Get Movie Metadata
```
GET /api/metadata/movies?libraryId=optional
```
Retrieves all movie metadata, optionally filtered by library.

#### Get Movie Metadata by ID
```
GET /api/metadata/movies/{id}
```
Retrieves specific movie metadata by ID.

## Configuration

### TMDb API Key
Add your TMDb API key to configuration:

**appsettings.json:**
```json
{
  "TMDb": {
    "ApiKey": "your-tmdb-api-key-here"
  }
}
```

**Or via environment variable:**
```bash
export TMDB_API_KEY="your-tmdb-api-key-here"
```

### Get TMDb API Key
1. Create account at https://www.themoviedb.org/
2. Go to Settings > API
3. Request an API key
4. Use the API Key (v3 auth) in your configuration

## Example File Name Processing

| Original File Name | Extracted Title |
|-------------------|----------------|
| `Ready.Player.One.2018.2160p.UHD.BDRemux.HDR.DV.x265.TrueHD7.1-DVT.mkv` | `Ready Player One` |
| `Lilo.and.Stitch.1080p.rus.LostFilm.TV.mkv` | `Lilo and Stitch` |
| `Slow.Horses.S01E01.720p.rus.LostFilm.TV.mp4` | `Slow Horses` |

## Usage Examples

1. **Add libraries** using the existing library endpoints
2. **Run scan** to fetch metadata:
   ```bash
   curl -X POST https://your-api/api/metadata/scan \
     -H "Authorization: Bearer your-jwt-token"
   ```
3. **View results**:
   ```bash
   curl https://your-api/api/metadata/movies \
     -H "Authorization: Bearer your-jwt-token"
   ```

## Logging

The implementation includes comprehensive logging:
- Info level: Scan progress, successful metadata additions
- Debug level: File processing details, search queries
- Warning level: Missing directories, invalid file names
- Error level: API errors, database errors

## Performance Considerations

- Rate limited to respect TMDb API limits (250ms between requests)
- Duplicate detection prevents re-processing existing files
- Efficient MongoDB indexing for fast queries
- Asynchronous processing for non-blocking operations
