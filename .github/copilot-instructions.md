# Haas.Media - AI Agent Instructions

## Architecture Overview

**Tech Stack:** Hybrid .NET 9 backend + Next.js 15 frontend with .NET Aspire orchestration

### Service Boundaries

- **Haas.Media.Downloader.Api** - Main API backend (torrents, files, encoding, metadata)
- **Haas.Media.Core** - Shared FFmpeg utilities, media analysis, and encoding builders
- **Haas.Media.Web** - Next.js frontend (App Router, React 18, TypeScript)
- **Haas.Media.Aspire** - Orchestrates services using `AppHost.cs` with Docker Compose integration
- **Haas.Media.ServiceDefaults** - Shared telemetry, health checks, and service configurations

### Data Flow

```
Frontend (Next.js) → API (/api/*) → Background Tasks → SignalR Hub → Real-time updates
                                   ↓
                              LiteDB + File System (DATA_DIRECTORY)
```

## Critical Patterns

### 1. Background Task Infrastructure

**Location:** `src/Haas.Media.Downloader.Api/Infrastructure/BackgroundTasks/`

All long-running operations (encoding, metadata scans, file copies) use a unified background task system:

- **Create tasks** by extending `BackgroundTaskBase` (defines `Id`, `Type`, `Name`)
- **Implement executors** via `IBackgroundTaskExecutor<TTask, TPayload>` interface
- **Register** with `builder.Services.AddBackgroundTask<TTask, TPayload, TExecutor>()`
- **Execute** via `IBackgroundTaskManager.RunTask<TTask, TPayload>(task)`
- **Track** via SignalR hub at `/hub/background-tasks` - auto-broadcasts updates to connected clients

**Key files:**

- `BackgroundTaskManager.cs` - Singleton manager, runs as IHostedService
- `BackgroundWorkerContext.cs` - Provides task, state, cancellation, and progress reporting
- `BackgroundTaskHub.cs` - SignalR hub replays active tasks on connect

**Example:** `EncodingTask` (task) → `EncodingTaskExecutor` (worker) → Registered in `EncodingConfiguration.cs`

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

**Encoding:** Use `MediaEncodingBuilder` (fluent API) in `Haas.Media.Core` for quality presets, hardware acceleration (VAAPI, NVENC, QSV), and codec selection.

**Critical:** FFmpeg path configured via `FFMPEG_BINARY` env var, set in `GlobalFFOptions.Configure()` during startup

### 4. Feature-Based Structure (Next.js)

**Location:** `src/Haas.Media.Web/features/`

```
features/
  ├── <feature>/
      ├── components/      # Feature-specific UI components
      ├── hooks/          # Feature-specific hooks
      └── api calls or utilities
```

Shared components live in `src/Haas.Media.Web/components/` (ShadCN UI components + layouts)

### 5. SignalR Real-Time Updates

**Pattern:** Frontend hooks (`useMetadataSignalR`, `useTorrentSignalR`) connect to hubs:

- `/hub/background-tasks` - Task status updates
- `/hub/torrents` - Torrent progress updates

**Auth:** JWT token passed via query string (`?access_token=...`) for WebSocket upgrade

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

### TMDB Metadata

- **Service:** `TMDbLib.Client` in metadata scanning tasks
- **Rate limiting:** Implements throttling in `BackgroundTaskManager` (200ms broadcast throttle)
- **Docs:** See `docs/backend/tmdb-throttling.md` and `docs/backend/theatrical-release-dates.md`

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
