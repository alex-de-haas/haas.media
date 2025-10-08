> [!WARNING]
> This project was mostly written with the help of AI agents for the purpose of testing this technology. As progress is made, I will leave my comments and recommendations.

# Haas.Media

A modern web application for downloading torrents and encoding videos to various formats with hardware acceleration support.

## AI Agents

- [GitHub Copilot](https://github.com/features/copilot)
- [OpenAI Codex](https://openai.com/codex/)

## MCP Servers

- [ShadCN MCP](https://ui.shadcn.com/docs/mcp)

## 🚀 Features

- **Torrent Management**: Download and manage torrent files
- **Video Encoding**: Convert videos to different formats with hardware acceleration
- **Video Streaming**: Stream videos with on-the-fly FFmpeg transcoding for universal compatibility
- **Real-time Updates**: Live status updates using SignalR
- **Flexible Authentication**: Choose between Auth0 (cloud) or local LiteDB-based authentication
- **Metadata Management**: Automatic metadata scanning and organization
- **Hardware Acceleration**: Support for VAAPI and other hardware encoding methods

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type-safe development
- **Auth0** - Authentication and authorization
- **SignalR** - Real-time communication

### Backend

- **.NET 9** - Cross-platform backend framework
- **ASP.NET Core** - Web API framework
- **LiteDB** - Embedded document database
- **FFmpeg** - Video processing and encoding
- **.NET Aspire** - Cloud-native application orchestration

## 📁 Project Structure

```
├── src/
│   ├── Haas.Media.Web/           # Next.js frontend application
│   ├── Haas.Media.Downloader.Api/ # .NET API backend
│   ├── Haas.Media.Core/          # Core business logic and utilities
│   ├── Haas.Media.Aspire/        # Application orchestration
│   └── Haas.Media.ServiceDefaults/ # Shared service configurations
├── docs/                         # Documentation
└── data/                         # Media files and downloads
```

## 🚦 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [FFmpeg](https://ffmpeg.org/) (for video processing)

### Environment Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/alex-de-haas/haas.media.git
   cd haas.media
   ```

2. **Configure environment variables**
   Create a `.env.local` file in the root directory (see `.env.example` for all options):

   ```env
   # Required
   DATA_DIRECTORY=/path/to/media/data
   FFMPEG_BINARY=/usr/bin/ffmpeg
   TMDB_API_KEY=your-tmdb-api-key

   # Authentication Option 1: Local Authentication (Default)
   JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-long

   # Authentication Option 2: Auth0 (Optional)
   # AUTH0_DOMAIN=your-auth0-domain
   # AUTH0_AUDIENCE=your-auth0-audience
   # AUTH0_SECRET=your-auth0-secret
   # AUTH0_BASE_URL=http://localhost:3000
   # AUTH0_CLIENT_ID=your-client-id
   # AUTH0_CLIENT_SECRET=your-client-secret
   ```

   **Generate a JWT secret for local authentication:**
   ```bash
   ./scripts/generate-jwt-secret.sh
   ```

3. **Install dependencies**

   ```bash
   # Backend dependencies
   dotnet restore

   # Frontend dependencies
   cd src/Haas.Media.Web
   npm install
   ```

### Running the Application

#### Option 1: Using .NET Aspire (Recommended)

```bash
cd src/Haas.Media.Aspire
dotnet run
```

This will start the API and the web frontend.

#### Option 2: Manual Setup

1. **Start the API**

   ```bash
   cd src/Haas.Media.Downloader.Api
   dotnet run
   ```

2. **Start the Frontend**
   ```bash
   cd src/Haas.Media.Web
   npm run dev
   ```

The application will be available at:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000

## 🧹 Formatting

Pre-commit hooks automatically format staged files so you never commit inconsistent styles.

- **Frontend & Docs**: Prettier runs on staged JavaScript, TypeScript, Markdown, JSON, and stylesheet files.
- **Backend (.NET)**: CSharpier formats staged C# files.

To format everything manually:

```bash
npm run format
```

To verify formatting without making changes:

```bash
npm run format:check
```

## 📚 Documentation

- Backend
  - [API Reference](docs/API.md)
  - [File Management Module](docs/backend/file-management.md)
  - [Metadata Domain](docs/backend/metadata.md)
  - [Metadata Scanning Pipeline](docs/backend/metadata-scanning.md)
  - [TMDb Throttling](docs/backend/tmdb-throttling.md)
  - [Local Authentication](docs/backend/local-authentication.md)
- Frontend
  - [Client Layout System](docs/frontend/client-layout.md)
  - [TMDb Search Modal](docs/frontend/search-modal.md)
  - [Figma](https://www.figma.com/design/OQOX212YTk2I1LQYXcGo3K/Haas.Media)
- Infrastructure
  - [Auth0 Integration](docs/infrastructure/auth0.md)
  - [LiteDB Integration](docs/infrastructure/litedb.md)
  - [Hardware Encoding](docs/infrastructure/hardware-encoding.md)

## 🔧 Configuration

### Hardware Acceleration

The application supports various hardware acceleration methods:

- **VAAPI** (Linux) - For AMD and Intel GPUs
- **NVENC** (NVIDIA) - For NVIDIA GPUs
- **Quick Sync** (Intel) - For Intel integrated graphics

See [Hardware Encoding](docs/infrastructure/hardware-encoding.md) for detailed setup instructions.

### Docker Support

Use the provided Docker Compose files for different environments:

- `docker-compose.yml` - Standard configuration

## � Authentication

The application supports two authentication modes:

### Local Authentication (Default)
- **User Store**: LiteDB-based
- **Password Security**: BCrypt hashing (work factor 12)
- **Tokens**: Self-signed JWT tokens
- **Setup**: Set `JWT_SECRET` in `.env.local`
- **Registration**: Navigate to `/register` to create accounts

### Auth0 (Optional)
- **Enterprise Security**: Cloud-based authentication
- **Features**: MFA, social logins, email verification
- **Setup**: Configure Auth0 environment variables
- **Docs**: See [Auth0 Integration](docs/infrastructure/auth0.md)

The system automatically selects the authentication mode based on your environment variables. See [Local Authentication](docs/backend/local-authentication.md) for details.

## 🛡️ Security

- Flexible authentication (Auth0 or local with BCrypt)
- JWT token-based authorization
- Secure API endpoints
- Environment-based configuration
- Input validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Links

- [Repository](https://github.com/alex-de-haas/haas.media)
- [Issues](https://github.com/alex-de-haas/haas.media/issues)
- [Documentation](docs/)

## 📞 Support

For support and questions, please open an issue on GitHub or contact the maintainers.
