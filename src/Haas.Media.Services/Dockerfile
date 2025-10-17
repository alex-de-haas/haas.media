# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
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

# Install ffmpeg and VA-API dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libva2 \
        vainfo \
        mesa-va-drivers \
        libdrm2 \
        libdrm-amdgpu1 \
        libva-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy published app
COPY --from=build /app/publish .

# Optional: set a non-root user for better security
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

ENTRYPOINT ["dotnet", "Haas.Media.Services.dll"]
