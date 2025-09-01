# MongoDB Integration

This document describes the MongoDB integration in the Haas.Media application.

## Overview

The application uses MongoDB for persistent storage of download metadata and tracking. The integration is built using .NET Aspire MongoDB hosting and client integrations.

## Architecture

### Aspire Host Configuration

The MongoDB server is configured in `AppHost.cs`:

```csharp
// Add MongoDB with MongoDB Express admin UI
var mongodb = builder.AddMongoDB("mongodb")
    .WithMongoExpress();
var mongoDatabase = mongodb.AddDatabase("haas-media-db");

// Connect the API to MongoDB
var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithReference(mongoDatabase)
    // ... other configurations
```

This configuration:
- Starts a MongoDB container for local development
- Includes MongoDB Express web admin UI
- Creates a database named "haas-media-db"
- Connects the Downloader API to the database

### API Configuration

The Downloader API is configured to use MongoDB in `Program.cs`:

```csharp
// Add MongoDB client
builder.AddMongoDBClient("haas-media-db");

// Register MongoDB services
builder.Services.AddScoped<DownloadService>();
```

## Data Models

### Download Model

The `Download` model represents a file download:

```csharp
public class Download
{
    public string? Id { get; set; }
    public required string FileName { get; set; }
    public required string FilePath { get; set; }
    public DownloadStatus Status { get; set; }
    public long TotalBytes { get; set; }
    public long DownloadedBytes { get; set; }
    public double Progress { get; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? Error { get; set; }
}
```

### Download Status

```csharp
public enum DownloadStatus
{
    Pending,
    InProgress,
    Completed,
    Failed,
    Cancelled
}
```

## Services

### DownloadService

The `DownloadService` provides CRUD operations for downloads:

- `GetAllAsync()` - Get all downloads
- `GetByIdAsync(id)` - Get download by ID
- `CreateAsync(download)` - Create new download
- `UpdateAsync(id, download)` - Update download
- `UpdateStatusAsync(id, status, error)` - Update download status
- `UpdateProgressAsync(id, downloadedBytes, totalBytes)` - Update download progress
- `DeleteAsync(id)` - Delete download

## API Endpoints

### Downloads Controller

- `GET /api/downloads` - Get all downloads
- `GET /api/downloads/{id}` - Get download by ID
- `POST /api/downloads` - Create new download
- `PUT /api/downloads/{id}/status` - Update download status
- `PUT /api/downloads/{id}/progress` - Update download progress
- `DELETE /api/downloads/{id}` - Delete download

### Health Controller

- `GET /api/health` - Check MongoDB connectivity
- `GET /api/health/database` - Get database information

## Package Dependencies

### Aspire Host

```xml
<PackageReference Include="Aspire.Hosting.MongoDB" Version="9.4.0" />
```

### Downloader API

```xml
<PackageReference Include="Aspire.MongoDB.Driver.v3" Version="9.4.0" />
```

## Local Development

When running locally via Aspire:

1. MongoDB runs in a Docker container
2. MongoDB Express admin UI is available at the URL shown in the Aspire dashboard
3. The database "haas-media-db" is automatically created
4. Connection strings are automatically configured via Aspire

## Connection Configuration

Aspire automatically configures the MongoDB connection string. The connection name "haas-media-db" must match between:

- The database name in `AppHost.cs`: `mongodb.AddDatabase("haas-media-db")`
- The client connection name in `Program.cs`: `builder.AddMongoDBClient("haas-media-db")`

## Health Checks

The application includes automatic health checks for MongoDB:

- Aspire automatically adds MongoDB health checks
- Custom health endpoint at `/api/health` provides detailed connectivity information
- Health status is available in the Aspire dashboard

## Monitoring

- MongoDB operations are automatically traced via OpenTelemetry
- Metrics and logs are available in the Aspire dashboard
- MongoDB Express provides a web interface for database administration

## Production Deployment

For production deployment:

1. Configure the MongoDB connection string in the application configuration
2. The `Aspire.MongoDB.Driver.v3` package will use the configured connection string
3. Ensure proper authentication and security configurations for your MongoDB instance
