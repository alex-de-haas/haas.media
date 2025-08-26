# Files Management API

This module provides file management capabilities for the Haas Media application, including copy, move, delete operations for files and directories.

## Configuration

The Files API uses a configurable root directory path that can be set via the `FILES_ROOT_PATH` configuration key. By default, it uses `data/files` relative to the application's current directory.

```json
{
  "FILES_ROOT_PATH": "data/files"
}
```

## Security

- All operations are restricted to the configured root directory
- Path traversal attacks are prevented (no `..` or absolute paths allowed)
- All endpoints require authorization

## API Endpoints

### GET /api/files
Get list of files and directories in a path.

**Query Parameters:**
- `path` (optional): Relative path within the root directory

**Response:** Array of `MediaFileInfo` objects

### POST /api/files/copy
Copy a file from source to destination.

**Request Body:**
```json
{
  "sourcePath": "path/to/source/file.txt",
  "destinationPath": "path/to/destination/file.txt",
  "overwrite": false
}
```

### POST /api/files/move
Move/rename a file from source to destination.

**Request Body:**
```json
{
  "sourcePath": "path/to/source/file.txt",
  "destinationPath": "path/to/destination/file.txt",
  "overwrite": false
}
```

### DELETE /api/files
Delete a file.

**Query Parameters:**
- `path` (required): Relative path to the file to delete

### DELETE /api/files/directory
Delete a directory and all its contents.

**Query Parameters:**
- `path` (required): Relative path to the directory to delete

### POST /api/files/directory
Create a new directory.

**Request Body:**
```json
{
  "path": "path/to/new/directory"
}
```

## SignalR Hub

The Files API includes a SignalR hub at `/hub/files` for real-time file system notifications.

### Hub Methods

- `JoinFileGroup(path)`: Join a group to receive notifications for a specific path
- `LeaveFileGroup(path)`: Leave a group to stop receiving notifications

## MediaFileInfo Model

```csharp
public record MediaFileInfo
{
    public string Name { get; init; }           // File/directory name
    public string RelativePath { get; init; }  // Relative path from root
    public long Size { get; init; }            // File size in bytes (0 for directories)
    public DateTimeOffset LastModified { get; init; } // Last modification time
    public string Extension { get; init; }     // File extension (empty for directories)
    public bool IsDirectory { get; init; }     // Whether this is a directory
    public MediaInfo? MediaInfo { get; set; }  // Optional media metadata for media files
}
```

## Usage Examples

### List root directory files
```http
GET /api/files
```

### List files in subdirectory
```http
GET /api/files?path=subfolder
```

### Copy a file
```http
POST /api/files/copy
Content-Type: application/json

{
  "sourcePath": "movies/video.mp4",
  "destinationPath": "backup/video.mp4"
}
```

### Move a file
```http
POST /api/files/move
Content-Type: application/json

{
  "sourcePath": "temp/video.mp4",
  "destinationPath": "movies/video.mp4"
}
```

### Create directory
```http
POST /api/files/directory
Content-Type: application/json

{
  "path": "movies/action"
}
```

### Delete file
```http
DELETE /api/files?path=temp/unwanted.txt
```

### Delete directory
```http
DELETE /api/files/directory?path=temp/old_folder
```
