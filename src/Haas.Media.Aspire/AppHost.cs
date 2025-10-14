using DotNetEnv;

var env = Env.TraversePath().Load().ToDictionary();

var builder = DistributedApplication.CreateBuilder(args);
builder.AddDockerComposeEnvironment("haas-media");

// Helper to safely get env values
string GetEnvOrEmpty(string key) => env.TryGetValue(key, out var value) ? value : string.Empty;

// Local auth parameters
var jwtSecret = builder.AddParameter("jwt-secret", value: GetEnvOrEmpty("JWT_SECRET"), secret: true);
var jwtIssuer = builder.AddParameter("jwt-issuer", value: GetEnvOrEmpty("JWT_ISSUER"));
var jwtAudience = builder.AddParameter("jwt-audience", value: GetEnvOrEmpty("JWT_AUDIENCE"));
var jwtExpirationMinutes = builder.AddParameter("jwt-expiration-minutes", value: GetEnvOrEmpty("JWT_EXPIRATION_MINUTES"));

// TMDb parameters
var tmdbApiKey = builder.AddParameter("tmdb-api-key", value: GetEnvOrEmpty("TMDB_API_KEY"), secret: true);

// URLs
var webBaseUrl = builder.AddParameter("web-base-url", "http://localhost:3000");
var apiBaseUrl = builder.AddParameter("api-base-url", "http://localhost:8000");
var configuredInternalApiBaseUrl = GetEnvOrEmpty("INTERNAL_API_BASE_URL");
var internalApiBaseUrl = builder.AddParameter(
    "internal-api-base-url",
    string.IsNullOrWhiteSpace(configuredInternalApiBaseUrl)
        ? (builder.ExecutionContext.IsPublishMode ? "http://downloader-api:8080" : "http://localhost:8000")
        : configuredInternalApiBaseUrl
);

var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithHttpEndpoint(port: 8000)
    .WithEnvironment("JWT_SECRET", jwtSecret)
    .WithEnvironment("JWT_ISSUER", jwtIssuer)
    .WithEnvironment("JWT_AUDIENCE", jwtAudience)
    .WithEnvironment("JWT_EXPIRATION_MINUTES", jwtExpirationMinutes)
    .WithEnvironment("TMDB_API_KEY", tmdbApiKey)
    .WithEnvironment("DATA_DIRECTORY", builder.ExecutionContext.IsPublishMode ? "/data" : GetEnvOrEmpty("DATA_DIRECTORY"))
    .WithEnvironment("FFMPEG_BINARY", builder.ExecutionContext.IsPublishMode ? "/ffmpeg" : GetEnvOrEmpty("FFMPEG_BINARY"))
    .WithEnvironment("ALLOWED_CORS_ORIGINS", webBaseUrl)
    .WithExternalHttpEndpoints()
    .WithOtlpExporter()
    .PublishAsDockerFile(config =>
    {
        config.WithDockerfile("..", dockerfilePath: "Haas.Media.Downloader.Api/Dockerfile");
        config.WithBindMount(GetEnvOrEmpty("DATA_DIRECTORY"), "/data", isReadOnly: false);
        config.WithBindMount(GetEnvOrEmpty("FFMPEG_BINARY"), "/ffmpeg", isReadOnly: true);
    });

var web = builder
    .AddNpmApp(
        "web",
        "../Haas.Media.Web",
        scriptName: builder.ExecutionContext.IsPublishMode ? "start" : "dev"
    )
    .WithHttpEndpoint(port: 3000, targetPort: 3000, isProxied: false)
    .WithEnvironment("API_BASE_URL", apiBaseUrl)
    .WithEnvironment("NEXT_PUBLIC_API_BASE_URL", apiBaseUrl)
    .WithEnvironment("INTERNAL_API_BASE_URL", internalApiBaseUrl)
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

builder.Build().Run();
