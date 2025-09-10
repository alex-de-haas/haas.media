var env = DotNetEnv.Env.LoadMulti([".env.local"]).ToDictionary();

var builder = DistributedApplication.CreateBuilder(args);
builder.AddDockerComposeEnvironment("haas-media");

// Add MongoDB
var mongoUsername = builder.AddParameter("mongo-username", value: env["MONGO_USERNAME"]);
var mongoPassword = builder.AddParameter("mongo-password", value: env["MONGO_PASSWORD"], secret: true);

var mongodb = builder
    .AddMongoDB("mongodb", userName: mongoUsername, password: mongoPassword)
    .WithMongoExpress()
    .WithBindMount(env["MONGO_DATA_DIRECTORY"], "/data/db");

var mongoDatabase = mongodb.AddDatabase("haas-media-db");

// Auth0 parameters
var auth0Domain = builder.AddParameter("auth0-domain", value: env["AUTH0_DOMAIN"]);
var auth0Audience = builder.AddParameter("auth0-audience", value: env["AUTH0_AUDIENCE"]);
var auth0Secret = builder.AddParameter("auth0-secret", value: env["AUTH0_SECRET"], secret: true);
var auth0BaseUrl = builder.AddParameter("auth0-base-url", value: env["AUTH0_BASE_URL"]);
var auth0ClientId = builder.AddParameter("auth0-client-id", value: env["AUTH0_CLIENT_ID"]);
var auth0ClientSecret = builder.AddParameter("auth0-client-secret", value: env["AUTH0_CLIENT_SECRET"], secret: true);

// TMDb parameters
var tmdbApiKey = builder.AddParameter("tmdb-api-key", value: env["TMDB_API_KEY"], secret: true);

var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithHttpEndpoint(port: 8000)
    .WithReference(mongoDatabase)
    .WithEnvironment("AUTH0_DOMAIN", auth0Domain)
    .WithEnvironment("AUTH0_AUDIENCE", auth0Audience)
    .WithEnvironment(
        "DATA_DIRECTORY",
        builder.ExecutionContext.IsPublishMode ? "/data" : env["DATA_DIRECTORY"]
    )
    .WithEnvironment(
        "FFMPEG_BINARY",
        builder.ExecutionContext.IsPublishMode ? "/usr/bin" : env["FFMPEG_BINARY"]
    )
    .WithEnvironment("TMDB_API_KEY", tmdbApiKey)
    .WithExternalHttpEndpoints()
    .WithOtlpExporter()
    .PublishAsDockerFile(config =>
    {
        config.WithDockerfile("..", dockerfilePath: "Haas.Media.Downloader.Api/Dockerfile");
    })
    .WithReference(mongoDatabase)
    .WaitFor(mongodb);

var web = builder
    .AddNpmApp(
        "web",
        "../Haas.Media.Web",
        scriptName: builder.ExecutionContext.IsPublishMode ? "start" : "dev"
    )
    .WithHttpEndpoint(port: 3000, targetPort: 3000, isProxied: false)
    .WithEnvironment("NEXT_PUBLIC_API_DOWNLOADER_URL", downloaderApi.GetEndpoint("http"))
    .WithEnvironment("AUTH0_DOMAIN", auth0Domain)
    .WithEnvironment("AUTH0_AUDIENCE", auth0Audience)
    .WithEnvironment("AUTH0_SECRET", auth0Secret)
    .WithEnvironment("AUTH0_BASE_URL", auth0BaseUrl)
    .WithEnvironment("AUTH0_CLIENT_ID", auth0ClientId)
    .WithEnvironment("AUTH0_CLIENT_SECRET", auth0ClientSecret)
    .WithEnvironment("AUTH0_ISSUER_BASE_URL", $"https://{auth0Domain}")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

downloaderApi.WithEnvironment("AllowedCorsOrigins__0", web.GetEndpoint("http"));

builder.Build().Run();
