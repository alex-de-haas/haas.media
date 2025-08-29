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

# Build and publish
RUN dotnet publish "Haas.Media.Downloader.Api/Haas.Media.Downloader.Api.csproj" -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0-bookworm-slim AS final
WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libva2 \
        vainfo \
        mesa-va-drivers \
        libdrm2 \
        libdrm-amdgpu1 \
        libva-dev \
        intel-media-va-driver \
        mesa-vulkan-drivers \
    && rm -rf /var/lib/apt/lists/*

# Ensure VA-API uses AMD's radeonsi driver in containers
# Also set up Intel driver path for hybrid systems
ENV LIBVA_DRIVER_NAME=radeonsi \
    LIBVA_DRIVERS_PATH=/usr/lib/x86_64-linux-gnu/dri \
    LIBVA_MESSAGING_LEVEL=2

# Copy published app
COPY --from=build /app/publish .

# Optional: set a non-root user for better security
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

ENTRYPOINT ["dotnet", "Haas.Media.Downloader.Api.dll"]
