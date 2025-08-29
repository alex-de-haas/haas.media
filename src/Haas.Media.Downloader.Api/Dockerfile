# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-bookworm-slim AS build
WORKDIR /src

# Copy project files
COPY Haas.Media.Core/Haas.Media.Core.csproj Haas.Media.Core/
COPY Haas.Media.ServiceDefaults/Haas.Media.ServiceDefaults.csproj Haas.Media.ServiceDefaults/
COPY Haas.Media.Downloader.Api/Haas.Media.Downloader.Api.csproj Haas.Media.Downloader.Api/

# Restore dependencies
RUN dotnet restore "Haas.Media.Downloader.Api/Haas.Media.Downloader.Api.csproj"

# Copy source code
COPY /Haas.Media.Core/ Haas.Media.Core/
COPY /Haas.Media.ServiceDefaults/ Haas.Media.ServiceDefaults/
COPY /Haas.Media.Downloader.Api/ Haas.Media.Downloader.Api/

# Build and publish (framework-dependent; requires ASP.NET runtime in final image)
RUN dotnet publish "Haas.Media.Downloader.Api/Haas.Media.Downloader.Api.csproj" -c Release -o /app/publish --no-restore

# Runtime stage (use jellyfin-ffmpeg image for FFmpeg + HW accel)
FROM nerethos/stash-jellyfin-ffmpeg:latest AS final
WORKDIR /app

# Install ASP.NET Core 9 runtime
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends curl ca-certificates; \
    rm -rf /var/lib/apt/lists/*; \
    curl -sSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh; \
    bash /tmp/dotnet-install.sh --channel 9.0 --runtime aspnetcore --install-dir /usr/share/dotnet; \
    ln -s /usr/share/dotnet/dotnet /usr/bin/dotnet

# Copy published app
COPY --from=build /app/publish .

# Optional: set a non-root user for better security
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

# Framework-dependent: run with dotnet
ENTRYPOINT ["dotnet", "Haas.Media.Downloader.Api.dll"]
