# MD5 Hash Validation for File Downloads

## Overview

This document describes the MD5 hash validation system implemented for file metadata and node file downloads. The system ensures file integrity by calculating and validating MD5 hashes during file operations.

## Features

### 1. File Metadata MD5 Hash Storage

All `FileMetadata` records now include an optional `Md5Hash` property that stores the MD5 hash of the file content.

**Location:** `src/Haas.Media.Services/Metadata/Models/FileMetadata.cs`

```csharp
/// <summary>
/// MD5 hash of the file content for integrity verification.
/// Calculated when file is added locally or fetched from nodes.
/// Used to validate downloaded files from nodes.
/// </summary>
public string? Md5Hash { get; set; }
```

### 2. Automatic Hash Calculation During Library Scans

MD5 hashes are automatically calculated when files are scanned and added to the library:

- **TV Show Episodes:** Hash calculated when episode files are discovered during TV show metadata scanning
- **Movies:** Hash calculated when movie files are discovered during movie metadata scanning
- **Existing Files:** If a file already exists but lacks a hash, the hash is calculated and updated during the next scan

**Implementation:** `src/Haas.Media.Services/Metadata/MetadataScanTaskExecutor.cs`

### 3. Hash Validation During Node Downloads

When downloading files from connected nodes, the system validates file integrity:

1. **Before Download:** Retrieves the expected MD5 hash from the source file's metadata
2. **After Download:** Calculates the actual MD5 hash of the downloaded file
3. **Validation:** Compares expected vs. actual hash
4. **On Failure:** Deletes the corrupted file and throws an error
5. **On Success:** Updates the local file metadata with the validated hash

**Implementation:** `src/Haas.Media.Services/Nodes/NodeFileDownloadTaskExecutor.cs`

### 4. Download Progress Tracking

The `NodeFileDownloadInfo` payload includes hash validation status:

```csharp
public sealed record NodeFileDownloadInfo(
    // ... other properties
    string? ExpectedMd5Hash,    // Hash from source node
    string? ActualMd5Hash,      // Hash of downloaded file
    bool? HashValidated         // true if validated, false if mismatch, null if no validation
);
```

This information is broadcast via SignalR to provide real-time feedback to users.

## File Hash Utility

A dedicated utility class provides hash calculation functions:

**Location:** `src/Haas.Media.Services/Utilities/FileHashUtility.cs`

### Methods

```csharp
// Calculate MD5 hash from file path
public static async Task<string> CalculateMd5HashAsync(
    string filePath,
    CancellationToken cancellationToken = default
)

// Calculate MD5 hash from stream
public static async Task<string> CalculateMd5HashAsync(
    Stream stream,
    CancellationToken cancellationToken = default
)

// Validate file hash against expected hash
public static async Task<bool> ValidateMd5HashAsync(
    string filePath,
    string expectedHash,
    CancellationToken cancellationToken = default
)
```

### Hash Format

- All hashes are returned as **lowercase hexadecimal strings**
- Comparison is **case-insensitive** for compatibility

## Workflows

### Workflow 1: Adding New Local Files

1. User initiates library scan
2. System discovers video files
3. For each file:
   - Calculate MD5 hash
   - Fetch metadata from TMDb
   - Create `FileMetadata` record with hash
   - Store in LiteDB

### Workflow 2: Downloading from Node

1. User initiates file download from connected node
2. System retrieves expected MD5 hash from source file metadata
3. Downloads file from node to local library
4. Calculates MD5 hash of downloaded file
5. Validates: `actualHash == expectedHash`
6. **If valid:**
   - Updates local file metadata (NodeId → null, LibraryId set, FilePath updated, Md5Hash set)
   - Completes task successfully
7. **If invalid:**
   - Deletes corrupted file
   - Throws error with expected vs. actual hash values
   - Task fails with detailed error message

### Workflow 3: Fetching Metadata from Node

When fetching file metadata from a connected node:

1. Node sends `FileMetadata` including `Md5Hash`
2. Local system stores metadata with hash intact
3. Hash is used later during file download validation

## Error Handling

### Hash Calculation Failures

If hash calculation fails during library scan:

- Error is logged as warning
- File is still added to metadata without hash
- Download validation will be skipped for this file

### Hash Validation Failures

If hash validation fails during download:

- Downloaded file is deleted immediately
- Detailed error message includes both hashes
- Background task fails with `BackgroundTaskStatus.Failed`
- User receives notification via SignalR

Example error message:

```
File integrity check failed. Expected MD5: abc123..., Actual MD5: def456...
The file may be corrupted during transfer.
```

## Logging

Hash operations include comprehensive logging:

- **Debug Level:** Successful hash calculations with hash values
- **Info Level:** Hash validation success
- **Warning Level:** Hash calculation failures, missing hashes
- **Error Level:** Hash validation failures with both hash values

## Performance Considerations

- Hash calculation uses async I/O with buffered reading (4096 byte buffer)
- Uses .NET's built-in `MD5.HashDataAsync()` for efficient computation
- Hash calculation occurs:
  - During library scans (background operation)
  - After file download completes (before metadata update)
- Large files: Hash calculation may add seconds to scan/download time

## Future Enhancements

Potential improvements for consideration:

1. **SHA-256 Support:** More secure hash algorithm option
2. **Incremental Hashing:** Hash verification during streaming
3. **Hash Cache:** Store hashes separately for faster access
4. **Parallel Hashing:** Calculate hashes for multiple files concurrently during scans
5. **Hash Repair:** API endpoint to recalculate hashes for existing files

## Frontend Integration

The `FileMetadata` TypeScript type has been updated to include the hash:

**Location:** `src/Haas.Media.Web/types/metadata.ts`

```typescript
export interface FileMetadata {
  // ... other properties
  md5Hash?: string | null;
}
```

UI can display hash validation status during downloads by listening to SignalR updates on the `NodeFileDownloadInfo` payload.

## API Endpoints

No new endpoints were added. Hash functionality is integrated into existing endpoints:

- `POST /api/metadata/scan/start` - Initiates library scan with hash calculation
- `POST /api/nodes/{nodeId}/download-file` - Downloads file with hash validation
- `POST /api/nodes/{nodeId}/fetch-metadata` - Fetches metadata including hashes

## Security Considerations

- **MD5 is not cryptographically secure** - Used only for integrity checking, not security
- Hashes are stored in LiteDB (unencrypted)
- Hash validation prevents corrupted transfers but not malicious file substitution
- For security-critical use cases, consider SHA-256 or stronger algorithms

## Testing Recommendations

To test hash validation:

1. **Normal Download:** Download file from node, verify success
2. **Corrupted Transfer:** Manually modify file during transfer simulation
3. **Missing Hash:** Download file without source hash, verify graceful handling
4. **Hash Mismatch:** Modify source file's hash in database, attempt download
5. **Large Files:** Verify hash calculation performance on multi-GB files

## Troubleshooting

### File Download Fails with Hash Mismatch

**Symptoms:** Download completes but task fails with hash validation error

**Possible Causes:**

1. Network corruption during transfer
2. Source file modified after metadata was fetched
3. Different file versions on source vs. metadata

**Resolution:**

1. Check network stability
2. Re-fetch metadata from source node
3. Compare file sizes/timestamps
4. Retry download

### Library Scan Slow After Update

**Symptoms:** Library scans take significantly longer

**Cause:** MD5 calculation adds processing time per file

**Resolution:**

- Hash calculation is asynchronous and cancellable
- Performance impact scales with file size and count
- Expected: 10-50ms per small file, 1-5s per large file (>10GB)
- Scans still show progress during hash calculation
