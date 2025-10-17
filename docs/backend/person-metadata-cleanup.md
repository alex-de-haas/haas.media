# Automatic Person Metadata Cleanup

## Overview

When movies or TV shows are deleted, the system automatically queues a background task to clean up orphaned person metadata records. This ensures that person data (cast and crew) is only kept in the database when it's referenced by at least one movie or TV show in the library, while keeping the deletion API responsive by performing cleanup asynchronously.

## Implementation

### Location

- **Files**: 
  - `src/Haas.Media.Downloader.Api/Metadata/MetadataService.cs` - Deletion methods that queue cleanup
  - `src/Haas.Media.Downloader.Api/Metadata/PersonCleanupTask.cs` - Background task definition
  - `src/Haas.Media.Downloader.Api/Metadata/PersonCleanupTaskExecutor.cs` - Cleanup logic executor
  - `src/Haas.Media.Downloader.Api/Metadata/PersonCleanupOperationInfo.cs` - Task payload/progress
  - `src/Haas.Media.Downloader.Api/Metadata/MetadataConfiguration.cs` - Task registration

### Workflow

#### Movie Deletion

1. Retrieve the movie metadata by ID
2. Collect all person IDs from:
   - `Cast` members
   - `Crew` members
3. Delete the movie metadata record
4. **Queue a background cleanup task** with the collected person IDs
5. Return success to the API caller (deletion is now complete, cleanup happens asynchronously)

#### TV Show Deletion

1. Retrieve the TV show metadata by ID
2. Collect all person IDs from:
   - Show-level `Cast` members
   - Show-level `Crew` members
   - Episode-level `Cast` members (across all seasons/episodes)
   - Episode-level `Crew` members (across all seasons/episodes)
3. Delete the TV show metadata record
4. **Queue a background cleanup task** with the collected person IDs
5. Return success to the API caller (deletion is now complete, cleanup happens asynchronously)

#### Background Cleanup Task

The `PersonCleanupTaskExecutor` runs asynchronously and:

1. Receives the set of person IDs to check
2. For each person ID:
   - Check if the person appears in any remaining movies
   - Check if the person appears in any remaining TV shows (including episodes)
   - If not referenced anywhere, delete the person metadata record
3. Reports progress via SignalR (visible in background tasks UI)
4. Logs summary of checked and deleted records

### Person Reference Detection

The `CleanupOrphanedPeople` method checks for person references across:

**Movies:**
- `MovieMetadata.Cast[]` - Cast members with character information
- `MovieMetadata.Crew[]` - Crew members with job/department information

**TV Shows:**
- `TVShowMetadata.Cast[]` - Show-level cast
- `TVShowMetadata.Crew[]` - Show-level crew
- `TVShowMetadata.Seasons[].Episodes[].Cast[]` - Episode-level guest stars
- `TVShowMetadata.Seasons[].Episodes[].Crew[]` - Episode-level crew

## Performance Considerations

### Background Task Architecture

The cleanup operation runs as a **background task**, which provides several benefits:

- **Responsive API**: Delete operations return immediately without blocking
- **Progress tracking**: Cleanup progress visible via SignalR in the background tasks UI
- **Cancellable**: Users can cancel long-running cleanup tasks if needed
- **Non-blocking**: Doesn't hold up other operations while scanning for references

### Cleanup Performance

The background task performs:
- One full scan of all movies for each person ID
- One full scan of all TV shows (including nested episodes) for each person ID

For example, deleting a movie with 50 cast/crew members will result in:
- 50 × (movie collection scan + TV show collection scan)

The task uses `await Task.Yield()` between person checks to allow other tasks to run.

### Optimization Opportunities

If performance becomes an issue with large libraries, consider:

1. **Batch Processing**: Collect all person IDs first, then perform a single pass through movies and TV shows to build a "referenced persons" set.

2. **Inverted Index**: Maintain a separate collection tracking person-to-media relationships for faster lookups.

3. **Deferred Cleanup**: Aggregate person IDs from multiple deletions before starting cleanup.

For now, the straightforward background task approach is acceptable since:
- Movie/TV show deletions are infrequent operations
- Most media items have 10-50 cast/crew members
- LiteDB in-memory indexes make full scans relatively fast
- Background execution doesn't impact API responsiveness

## Logging

The cleanup process logs:

- **Debug level**: 
  - Queuing of cleanup task with person count
  - Individual person metadata deletions
- **Info level**: 
  - Start of cleanup task
  - Summary of total orphaned records cleaned up
- **Warning level**: 
  - When movie/TV show not found during deletion
  - When cleanup task payload is null

Example log output:
```
[INF] Deleted movie metadata with ID: 550
[DBG] Queued person cleanup task for 35 people from deleted movie 550
[INF] Starting person metadata cleanup for 35 people
[DBG] Deleted orphaned person metadata with ID: 287
[DBG] Deleted orphaned person metadata with ID: 819
[DBG] Deleted orphaned person metadata with ID: 1640
[INF] Person metadata cleanup completed: checked 35, deleted 3 orphaned record(s)
```

## Background Task Monitoring

The cleanup task is fully integrated with the background task system:

- **Task Name**: "Person metadata cleanup"
- **Task Type**: `PersonCleanupTask`
- **Payload**: `PersonCleanupOperationInfo` containing:
  - `TotalPeople`: Total number of people to check
  - `CheckedPeople`: Number of people checked so far
  - `DeletedPeople`: Number of orphaned people deleted
  - `Stage`: Current stage description
  - `StartedAt` / `CompletedAt`: Timestamps
- **Progress**: Percentage based on checked vs. total people
- **SignalR Hub**: `/hub/background-tasks` - broadcasts updates every 200ms
- **API Endpoints**: 
  - `GET /api/background-tasks` - List all tasks including cleanup
  - `DELETE /api/background-tasks/{id}` - Cancel a running cleanup task

## Testing Scenarios

### Scenario 1: Shared Cast Member

1. Add Movie A with Actor X in the cast
2. Add Movie B with Actor X in the cast
3. Delete Movie A
4. **Expected**: Actor X metadata is retained (referenced by Movie B)

### Scenario 2: Completely Orphaned Person

1. Add Movie A with Actor Y in the cast (unique to this movie)
2. Delete Movie A
3. **Expected**: Actor Y metadata is deleted

### Scenario 3: Cross-Media References

1. Add Movie A with Director Z in the crew
2. Add TV Show B with Director Z in the crew
3. Delete Movie A
4. **Expected**: Director Z metadata is retained (referenced by TV Show B)

### Scenario 4: Episode-Level Credits

1. Add TV Show C with Guest Star W in Episode 1
2. Delete TV Show C
3. **Expected**: Guest Star W metadata is deleted (only appeared in deleted show)

## Related Models

### PersonMetadata

```csharp
public class PersonMetadata
{
    public int Id { get; set; }                 // TMDb Person ID (BsonId)
    public string? Biography { get; set; }
    public DateTime? Birthday { get; set; }
    public DateTime? Deathday { get; set; }
    public PersonGender Gender { get; set; }
    public string Name { get; set; }
    public string? PlaceOfBirth { get; set; }
    public double Popularity { get; set; }
    public string? ProfilePath { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

### CastMember & CrewMember

```csharp
public class CastMember
{
    public int Id { get; set; }              // References PersonMetadata.Id
    public string Name { get; set; }
    public string Character { get; set; }
    public int Order { get; set; }
    public string? ProfilePath { get; set; }
}

public class CrewMember
{
    public int Id { get; set; }              // References PersonMetadata.Id
    public string Name { get; set; }
    public string Job { get; set; }
    public string Department { get; set; }
    public string? ProfilePath { get; set; }
}
```

## Database Impact

### Collections Modified

- **movieMetadata**: Movie records deleted as requested
- **tvShowMetadata**: TV show records deleted as requested
- **personMetadata**: Orphaned person records automatically removed

### No Changes To

- **fileMetadata**: File associations (handled separately by existing logic)
- **libraries**: Library definitions (unaffected by media deletion)

## API Endpoints

The cleanup is automatic and transparent to API consumers:

- `DELETE /api/metadata/movies/{id}` - Deletes movie + queues person cleanup task
- `DELETE /api/metadata/tvshows/{id}` - Deletes TV show + queues person cleanup task

No additional endpoints are needed for person cleanup. Progress can be monitored via the background tasks API.

## Frontend Integration

The cleanup task appears in the background tasks UI alongside other operations:

- Task list shows "Person metadata cleanup" with progress bar
- Real-time updates via SignalR show checked/deleted counts
- Users can see which cleanup tasks are running/completed
- Cleanup tasks can be cancelled if needed (though this is rarely necessary)

Example task state in UI:
```json
{
  "id": "01932b4e-7890-7abc-def0-123456789abc",
  "type": "PersonCleanupTask",
  "name": "Person metadata cleanup",
  "status": "Running",
  "progress": 45,
  "payload": {
    "totalPeople": 35,
    "checkedPeople": 16,
    "deletedPeople": 2,
    "stage": "Checking for orphaned people",
    "startedAt": "2025-10-17T10:30:00Z"
  }
}
```

