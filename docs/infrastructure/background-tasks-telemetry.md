# Background Task OpenTelemetry Instrumentation

## Overview

Background tasks are instrumented with OpenTelemetry tracing to provide comprehensive observability into task execution. Each background task creates a span with detailed metadata about execution lifecycle, status, and performance.

## Activity Source

**Source Name**: `Haas.Media.BackgroundTasks`  
**Location**: `CommonConstants.ActivitySources.BackgroundTasks`

The activity source is automatically registered with OpenTelemetry in `ServiceDefaults.Configurations.cs` and will be included in all telemetry exports (OTLP, Azure Monitor, etc.).

## Instrumentation Details

### Span Information

Each background task execution creates a span with the following structure:

**Span Name**: `BackgroundTask.{TaskType}`  
Examples:

- `BackgroundTask.MetadataScanTask`
- `BackgroundTask.AddToLibraryTask`
- `BackgroundTask.PersonCleanupTask`
- `BackgroundTask.MetadataRefreshTask`
- `BackgroundTask.EncodingTask`

**Activity Kind**: `Internal`

### Tags (Attributes)

All task executions include these tags:

| Tag                | Description                          | Example                                  |
| ------------------ | ------------------------------------ | ---------------------------------------- |
| `task.id`          | Unique task identifier (GUID)        | `"01932b4e-7890-7abc-def0-123456789abc"` |
| `task.type`        | Task class name                      | `"MetadataScanTask"`                     |
| `task.name`        | Human-readable task name             | `"Metadata library scan"`                |
| `task.status`      | Final task status                    | `"Completed"`, `"Failed"`, `"Cancelled"` |
| `task.duration_ms` | Total execution time in milliseconds | `12543.5`                                |

### Exception Tags (on failure)

When a task fails, additional exception details are recorded:

| Tag                    | Description                     |
| ---------------------- | ------------------------------- |
| `exception.type`       | Full type name of the exception |
| `exception.message`    | Exception message               |
| `exception.stacktrace` | Full stack trace                |

### Events

Background task spans emit lifecycle events:

| Event            | When                        | Description                                  |
| ---------------- | --------------------------- | -------------------------------------------- |
| `task.started`   | Task begins execution       | Indicates transition from Pending to Running |
| `task.completed` | Task completes successfully | Final status is Completed                    |
| `task.cancelled` | Task is cancelled           | User or system requested cancellation        |
| `task.failed`    | Task throws an exception    | Error details included in tags               |

### Status Codes

Activity status codes align with task outcomes:

- **`Ok`**: Task completed successfully
- **`Error`**: Task failed or was cancelled
  - Description includes error message or "Task was cancelled"

## Example Span

```json
{
  "name": "BackgroundTask.MetadataScanTask",
  "kind": "Internal",
  "startTime": "2025-10-17T10:30:00.123Z",
  "endTime": "2025-10-17T10:32:15.678Z",
  "status": {
    "code": "Ok"
  },
  "attributes": {
    "task.id": "01932b4e-7890-7abc-def0-123456789abc",
    "task.type": "MetadataScanTask",
    "task.name": "Metadata library scan",
    "task.status": "Completed",
    "task.duration_ms": 135555.0
  },
  "events": [
    {
      "name": "task.started",
      "timestamp": "2025-10-17T10:30:00.125Z"
    },
    {
      "name": "task.completed",
      "timestamp": "2025-10-17T10:32:15.675Z"
    }
  ]
}
```

## Example Failed Task Span

```json
{
  "name": "BackgroundTask.PersonCleanupTask",
  "kind": "Internal",
  "startTime": "2025-10-17T11:00:00.000Z",
  "endTime": "2025-10-17T11:00:05.123Z",
  "status": {
    "code": "Error",
    "description": "Object reference not set to an instance of an object."
  },
  "attributes": {
    "task.id": "01932c5f-1234-5678-9abc-def012345678",
    "task.type": "PersonCleanupTask",
    "task.name": "Person metadata cleanup",
    "task.status": "Failed",
    "task.duration_ms": 5123.0,
    "exception.type": "System.NullReferenceException",
    "exception.message": "Object reference not set to an instance of an object.",
    "exception.stacktrace": "   at Haas.Media.Downloader.Api.Metadata.PersonCleanupTaskExecutor.ExecuteAsync(...)"
  },
  "events": [
    {
      "name": "task.started",
      "timestamp": "2025-10-17T11:00:00.005Z"
    },
    {
      "name": "task.failed",
      "timestamp": "2025-10-17T11:00:05.120Z"
    }
  ]
}
```

## Integration with Observability Stack

### Aspire Dashboard

When running via .NET Aspire (`dotnet run --project src/Haas.Media.Aspire`), background task traces appear in the Aspire Dashboard at `http://localhost:18888`:

- **Traces Tab**: Filter by `BackgroundTask.*` to see all task executions
- **Metrics Tab**: Runtime metrics include task execution
- **Structured Logs Tab**: Correlated with trace IDs

### OTLP Export

If `OTEL_EXPORTER_OTLP_ENDPOINT` is configured, traces are exported to your observability backend:

```bash
# Example: Export to local Jaeger
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
```

Supported backends:

- Jaeger
- Zipkin
- Grafana Tempo
- Azure Monitor (Application Insights)
- Any OTLP-compatible collector

### Querying Traces

**Find all failed background tasks:**

```
span.kind = "Internal"
AND span.name LIKE "BackgroundTask.%"
AND task.status = "Failed"
```

**Find slow task executions (>5 minutes):**

```
span.kind = "Internal"
AND span.name LIKE "BackgroundTask.%"
AND task.duration_ms > 300000
```

**Find specific task type:**

```
span.kind = "Internal"
AND task.type = "MetadataScanTask"
```

## Performance Impact

The instrumentation overhead is minimal:

- **CPU**: Negligible (a few microseconds per task)
- **Memory**: ~1-2 KB per active span
- **I/O**: Only impacts telemetry export (async, non-blocking)

Background tasks already run asynchronously, so tracing does not affect API responsiveness.

## Disabling Instrumentation

To disable background task tracing (not recommended), remove the activity source registration from `ServiceDefaults/Configurations.cs`:

```csharp
// Remove this line:
.AddSource(CommonConstants.ActivitySources.BackgroundTasks)
```

## Related Files

- **Activity Source**: `src/Haas.Media.Core/CommonConstants.cs`
- **Instrumentation**: `src/Haas.Media.Downloader.Api/Infrastructure/BackgroundTasks/BackgroundTaskManager.cs`
- **OpenTelemetry Config**: `src/Haas.Media.ServiceDefaults/Configurations.cs`

## See Also

- [Background Tasks Documentation](../infrastructure/background-tasks.md)
- [Person Metadata Cleanup](person-metadata-cleanup.md)
- [.NET Aspire Dashboard](https://learn.microsoft.com/dotnet/aspire/fundamentals/dashboard)
- [OpenTelemetry .NET](https://opentelemetry.io/docs/languages/net/)
