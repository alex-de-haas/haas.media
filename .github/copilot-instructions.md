# Haas.Media - AI Agent Instructions

> A modern media management platform combining .NET 9 backend with Next.js 15 frontend, orchestrated by .NET Aspire. Supports torrent downloads, FFmpeg-based video encoding with hardware acceleration, metadata management via TMDb, and real-time updates through SignalR.

## Architecture Overview

**Tech Stack:** Hybrid .NET 9 backend + Next.js 15 frontend with .NET Aspire orchestration

### Service Boundaries

- **Haas.Media.Downloader.Api** - Main API backend (torrents, files, encoding, metadata, Jellyfin compatibility)
- **Haas.Media.Core** - Shared FFmpeg utilities (`MediaEncodingBuilder`), media analysis, hardware acceleration detection
- **Haas.Media.Web** - Next.js frontend (App Router, React 18, TypeScript, Jotai state, ShadCN UI)
- **Haas.Media.Aspire** - Orchestrates services using `AppHost.cs` with Docker Compose integration
- **Haas.Media.ServiceDefaults** - Shared telemetry, health checks, and service configurations

### Data Flow

```
Frontend (Next.js) → API (/api/*) → Background Tasks → SignalR Hub → Real-time updates
                                   ↓
                              LiteDB + File System (DATA_DIRECTORY)
```

**Key Interaction:** All long-running operations (encoding, metadata scans, torrent downloads) run through the unified background task system, broadcasting status via SignalR to maintain live UI updates.

## Critical Patterns

### 1. Background Task Infrastructure

**Location:** `src/Haas.Media.Downloader.Api/Infrastructure/BackgroundTasks/`

All long-running operations (encoding, metadata scans, file copies) use a unified background task system with automatic SignalR broadcasting:

**Creating a new background task:**

1. **Define task** by extending `BackgroundTaskBase`:
   ```csharp
   public sealed record MyTask : BackgroundTaskBase
   {
       public MyTask() : base("MyTask", "my-task", "My Task Display Name") { }
   }
   ```

2. **Create payload** (data needed during execution):
   ```csharp
   public sealed record MyTaskPayload(string FilePath, bool SomeOption);
   ```

3. **Implement executor** via `IBackgroundTaskExecutor<TTask, TPayload>`:
   ```csharp
   public class MyTaskExecutor : IBackgroundTaskExecutor<MyTask, MyTaskPayload>
   {
       public async Task ExecuteAsync(BackgroundWorkerContext<MyTaskPayload> context, CancellationToken cancellationToken)
       {
           context.ReportProgress(50, "Processing...");
           // Do work
           context.Complete();
       }
   }
   ```

4. **Register in feature configuration**:
   ```csharp
   builder.Services.AddBackgroundTask<MyTask, MyTaskPayload, MyTaskExecutor>();
   ```

5. **Execute** via `IBackgroundTaskManager`:
   ```csharp
   var taskId = _taskManager.RunTask<MyTask, MyTaskPayload>(task);
   ```

**Key features:**
- SignalR hub (`/hub/background-tasks`) auto-broadcasts task updates (200ms throttle to prevent flooding)
- `BackgroundTaskHub` replays active tasks on client connect
- `BackgroundWorkerContext` provides progress reporting, cancellation, and state management

**Example:** `EncodingTask` → `EncodingTaskExecutor` → Registered in `EncodingConfiguration.cs`

### 2. Feature Module Pattern (.NET API)

Each domain (Torrents, Encodings, Files, Metadata) follows this structure:

```
<Feature>/
  ├── <Feature>Configuration.cs      # Extension methods: AddXxx(), UseXxx()
  ├── I<Feature>Api.cs                # Public service interface
  ├── <Feature>Service.cs             # Service implementation
  ├── <Feature>Task.cs                # Background task definition
  └── <Feature>TaskExecutor.cs        # Task execution logic
```

**Registration:** `Program.cs` calls `builder.AddEncoding()` → registers services + tasks → `app.UseEncoding()` → maps endpoints

### 3. FFmpeg Integration

**Video Streaming:** `VideoStreamingService.cs` supports two modes:

- **Direct streaming** (default) - Range requests supported, seeking enabled, original quality
- **Transcoded streaming** (`?transcode=true`) - On-the-fly FFmpeg transcoding via `pipe:1`, NO range requests, NO seeking

**Encoding:** Use `MediaEncodingBuilder` fluent API in `Haas.Media.Core`:

```csharp
var builder = MediaEncodingBuilder.Create()
    .FromFileInput(inputPath)
    .ToFileOutput(outputPath)
    .WithAutoHardwareAcceleration()  // Auto-detects VAAPI/NVENC/QSV/AMF/VideoToolbox
    .WithQualityPreset(QualityPreset.High)
    .WithVideoCodec(StreamCodec.H264)
    .CopyAllAudioStreams()
    .CopyAllSubtitleStreams();

var arguments = builder.Build();
```

**Hardware acceleration detection:**
- `HardwareAccelerationInfo.DetectAvailable()` probes system capabilities
- VAAPI: Validates device exists (`/dev/dri/renderD128`, `/dev/dri/renderD129`, etc.)
- Auto mode: Picks best available (NVENC > VAAPI > QSV > AMF > VideoToolbox > None)

**Critical:** FFmpeg path configured via `FFMPEG_BINARY` env var, set in `GlobalFFOptions.Configure()` during startup in feature configurations (e.g., `EncodingConfiguration.cs`)

### 4. Feature-Based Structure (Next.js)

**Location:** `src/Haas.Media.Web/features/`

```
features/
  ├── <feature>/
      ├── components/      # Feature-specific UI components
      ├── hooks/           # Feature-specific hooks (e.g., useMetadataSignalR)
      └── api calls or utilities
```

**Available features:** `auth/`, `background-tasks/`, `files/`, `libraries/`, `media/`, `torrent/`

Shared components live in `src/Haas.Media.Web/components/` (ShadCN UI components + layouts)

### 5. SignalR Real-Time Updates

**Pattern:** Frontend hooks (`useMetadataSignalR`, `useTorrentSignalR`) connect to hubs:

- `/hub/background-tasks` - Task status updates (throttled to 200ms)
- `/hub/torrents` - Torrent progress updates

**Auth:** JWT token passed via query string (`?access_token=...`) for WebSocket upgrade. Configured in `Program.cs`:

```csharp
options.Events = new JwtBearerEvents
{
    OnMessageReceived = context =>
    {
        var accessToken = context.Request.Query["access_token"];
        if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hub"))
        {
            context.Token = accessToken!;
        }
        return Task.CompletedTask;
    }
};
```

## Developer Workflows

### Running the Application

```bash
# Development (uses .NET Aspire)
dotnet run --project src/Haas.Media.Aspire

# Frontend only (for UI work)
cd src/Haas.Media.Web
npm run dev
```

### Environment Setup

Create `.env` at project root:

```env
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-long
JWT_ISSUER=haas-media-local
JWT_AUDIENCE=haas-media-api
JWT_EXPIRATION_MINUTES=60
DATA_DIRECTORY=/path/to/data
FFMPEG_BINARY=/usr/bin/ffmpeg
TMDB_API_KEY=your-tmdb-key
```

**Critical:** Aspire reads from `.env` via `DotNetEnv` package in `AppHost.cs`

### Code Formatting

```bash
# Format everything (enforced via husky pre-commit)
npm run format

# Check formatting
npm run format:check
```

**Tools:** Prettier (JS/TS/CSS) + CSharpier (.NET) - configured in `package.json`

### Database

**LiteDB** embedded database at `{DATA_DIRECTORY}/.db/common.db`

- No migrations needed
- Document-based (MongoDB-like API)
- Used for metadata, library state, torrent info

## Project-Specific Conventions

### .NET API

- **Endpoints:** Prefer minimal APIs in `*Configuration.cs` files over controllers
- **DI:** Register feature modules via extension methods (`builder.AddXxx()`)
- **Auth:** All endpoints `.RequireAuthorization()` except health checks
- **Errors:** Use `Results.NotFound()`, `Results.BadRequest()`, etc. for HTTP responses

### Next.js Frontend

- **Routing:** App Router (`app/` directory) - see `nextjs.instructions.md` for patterns
- **State:** Jotai for client state (atoms in feature directories)
- **Styling:** Tailwind utility-first - see `tailwind.instructions.md` for class ordering
- **Components:** ShadCN UI via `components/ui/` - use `npx shadcn add <component>`
- **Types:** Mirror backend types in `src/Haas.Media.Web/types/`

### Git Commits

Follow Conventional Commits - see `.github/instructions/git.instructions.md`:

```
<type>(<scope>): <subject>

Types: feat, fix, refactor, perf, docs, test, build, ci, chore, revert
```

## Key Integration Points

### Local Authentication

- **Backend:** JWT validation in `Program.cs`, supports query string tokens for SignalR
- **Frontend:** Local auth context in `features/auth/local-auth-context.tsx`, middleware in `middleware.ts`
- **Storage:** User credentials stored in LiteDB
- **Env vars:** `JWT_SECRET` (required), `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_EXPIRATION_MINUTES`

### TMDB Metadata

- **Service:** `TMDbLib.Client` in metadata scanning tasks
- **Rate limiting:** Implements throttling in `BackgroundTaskManager` (200ms broadcast throttle)
- **Docs:** See `docs/backend/tmdb-throttling.md` and `docs/backend/theatrical-release-dates.md`

### Jellyfin Compatibility

- **Location:** `src/Haas.Media.Downloader.Api/Jellyfin/`
- **Purpose:** Provides Jellyfin-compatible endpoints for sidecar clients (Infuse, etc.)
- **Models:** `JellyfinModels.cs` mirrors Jellyfin API structures
- **Service:** `JellyfinService.cs` translates internal data to Jellyfin format

### Hardware Acceleration

- **Supported:** VAAPI (Linux), NVENC (NVIDIA), QSV (Intel), AMF (AMD), VideoToolbox (macOS)
- **Detection:** `HardwareAccelerationInfo.DetectAvailable()` in `Haas.Media.Core`
- **Configuration:** Set via `MediaEncodingBuilder.WithHardwareAcceleration()`
- **Docs:** See `docs/infrastructure/hardware-encoding.md` and `docs/operations/vaapi-troubleshooting.md`

## Documentation Rules

**DON'T create:**

- Task summaries or completion reports
- Issue descriptions or refactoring overviews

**DO create/update:**

- Feature documentation for new capabilities
- Architectural decision records
- Integration guides for external services
- Troubleshooting guides based on real issues

**Location:** `/docs` organized by concern (backend/, frontend/, infrastructure/, operations/)

## Quick Reference

- **API Base:** `http://localhost:8000/api`
- **Frontend:** `http://localhost:3000`
- **Aspire Dashboard:** `http://localhost:18888` (when running via Aspire)
- **Video Streaming:** `/api/files/stream?path=<path>&transcode=<bool>&quality=<preset>`
- **Background Tasks:** `/api/background-tasks` (GET all) or `/api/background-tasks/{id}` (GET/DELETE)
