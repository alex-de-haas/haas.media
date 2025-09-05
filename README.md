**IMPORTANT:** This project was mostly written with the help of AI agents for the purpose of testing this technology. As progress is made, I will leave my comments and recommendations.

# Haas.Media

A modern web application for downloading torrents and encoding videos to various formats with hardware acceleration support.

## AI Models

- Claude Sonnet 4 (GitHub Copilot)
- GPT-5 (GitHub Copilot, OpenAI Codex)

## 🚀 Features

- **Torrent Management**: Download and manage torrent files
- **Video Encoding**: Convert videos to different formats with hardware acceleration
- **Real-time Updates**: Live status updates using SignalR
- **Authentication**: Secure access with Auth0 integration
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
- **MongoDB** - Document database
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
├── data/                         # Media files and downloads
└── docker-compose.*.yml          # Docker configuration
```

## 🚦 Getting Started

### Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js 18+](https://nodejs.org/)
- [Docker](https://docker.com/) (for MongoDB)
- [FFmpeg](https://ffmpeg.org/) (for video processing)

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/alex-de-haas/haas.media.git
   cd haas.media
   ```

2. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # MongoDB
   MONGODB_DATA_DIRECTORY=/path/to/mongodb/data
   
   # Auth0
   AUTH0_DOMAIN=your-auth0-domain
   AUTH0_AUDIENCE=your-auth0-audience
   
   # Media Processing
   DATA_DIRECTORY=/path/to/media/data
   FFMPEG_BINARY=/usr/bin/ffmpeg
   
   # TMDB (for metadata)
   TMDB_API_KEY=your-tmdb-api-key
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

This will start all services including MongoDB, the API, and the web frontend.

#### Option 2: Manual Setup
1. **Start MongoDB**
   ```bash
   docker-compose up mongodb
   ```

2. **Start the API**
   ```bash
   cd src/Haas.Media.Downloader.Api
   dotnet run
   ```

3. **Start the Frontend**
   ```bash
   cd src/Haas.Media.Web
   npm run dev
   ```

The application will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **MongoDB Express**: http://localhost:8081

## 📚 Documentation

- [API Documentation](docs/API.md) - REST API endpoints and SignalR hubs
- [Client Layout](docs/CLIENT_LAYOUT.md) - Frontend architecture
- [Hardware Encoding](docs/HARDWARE_ENCODING.md) - Hardware acceleration setup
- [MongoDB Integration](docs/MONGODB_INTEGRATION.md) - Database configuration
- [Authentication](docs/README-AUTH.md) - Auth0 setup guide
- [VAAPI Troubleshooting](docs/VAAPI_TROUBLESHOOTING.md) - Hardware acceleration issues

### Module Documentation
- [File Manager](docs/Modules/FILE_MANAGER.md)
- [Metadata Scanning](docs/Modules/METADATA_SCANNING.md)
- [Metadata Management](docs/Modules/METADATA.md)

## 🔧 Configuration

### Hardware Acceleration
The application supports various hardware acceleration methods:
- **VAAPI** (Linux) - For AMD and Intel GPUs
- **NVENC** (NVIDIA) - For NVIDIA GPUs
- **Quick Sync** (Intel) - For Intel integrated graphics

See [HARDWARE_ENCODING.md](docs/HARDWARE_ENCODING.md) for detailed setup instructions.

### Docker Support
Use the provided Docker Compose files for different environments:
- `docker-compose.yml` - Standard configuration

## 🛡️ Security

- Authentication via Auth0
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
