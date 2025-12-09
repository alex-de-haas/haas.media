# Build stage
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files
COPY Haas.Media.Core/Haas.Media.Core.csproj Haas.Media.Core/
COPY Haas.Media.Services/Haas.Media.Services.csproj Haas.Media.Services/

# Restore dependencies
RUN dotnet restore "Haas.Media.Services/Haas.Media.Services.csproj"

# Copy source code
COPY /Haas.Media.Core/ Haas.Media.Core/
COPY /Haas.Media.Services/ Haas.Media.Services/

# Build and publish
RUN dotnet publish "Haas.Media.Services/Haas.Media.Services.csproj" -c Release -o /app/publish --no-restore

# Runtime stage
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

# Install ffmpeg and VA-API dependencies required for AMD GPUs under WSL2
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        vainfo \
        libva2 \
        libva-drm2 \
        mesa-va-drivers \
        mesa-vulkan-drivers \
        libdrm2 \
        libdrm-amdgpu1 \
        libgl1-mesa-dri \
        libxcb-dri3-0 \
    && rm -rf /var/lib/apt/lists/*

# Default runtime configuration for VAAPI on AMD (Radeon 890M)
ENV FFMPEG_BINARY=/usr/bin/ffmpeg \
    LIBVA_DRIVER_NAME=radeonsi \
    LIBVA_DRIVERS_PATH=/usr/lib/x86_64-linux-gnu/dri

# Copy published app
COPY --from=build /app/publish .

# Optional: set a non-root user for better security
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

ENTRYPOINT ["dotnet", "Haas.Media.Services.dll"]
