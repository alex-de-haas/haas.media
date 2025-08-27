var env = DotNetEnv.Env.LoadMulti([".env.local"]).ToDictionary();

var builder = DistributedApplication.CreateBuilder(args);
builder.AddDockerComposeEnvironment("haas-media");

var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithHttpEndpoint(port: 8000)
    .WithEnvironment("AUTH0_DOMAIN", env["AUTH0_DOMAIN"])
    .WithEnvironment("AUTH0_AUDIENCE", env["AUTH0_AUDIENCE"])
    .WithEnvironment("DATA_DIRECTORY", env["DATA_DIRECTORY"])
    .WithEnvironment(
        "FFMPEG_BINARY",
        builder.ExecutionContext.IsPublishMode ? "/usr/bin" : env["FFMPEG_BINARY"]
    )
    .WithExternalHttpEndpoints()
    .WithOtlpExporter()
    .PublishAsDockerFile(config =>
    {
        config.WithDockerfile("../", dockerfilePath: "Haas.Media.Downloader.Api/Dockerfile");
    });

var web = builder
    .AddNpmApp(
        "web",
        "../Haas.Media.Web",
        scriptName: builder.ExecutionContext.IsPublishMode ? "start" : "dev"
    )
    .WithHttpEndpoint(port: 3000, targetPort: 3000, isProxied: false)
    .WithEnvironment("NEXT_PUBLIC_API_DOWNLOADER_URL", downloaderApi.GetEndpoint("http"))
    .WithEnvironment("AUTH0_DOMAIN", env["AUTH0_DOMAIN"])
    .WithEnvironment("AUTH0_AUDIENCE", env["AUTH0_AUDIENCE"])
    .WithEnvironment("AUTH0_SECRET", env["AUTH0_SECRET"])
    .WithEnvironment("AUTH0_BASE_URL", env["AUTH0_BASE_URL"])
    .WithEnvironment("AUTH0_CLIENT_ID", env["AUTH0_CLIENT_ID"])
    .WithEnvironment("AUTH0_CLIENT_SECRET", env["AUTH0_CLIENT_SECRET"])
    .WithEnvironment("AUTH0_ISSUER_BASE_URL", $"https://{env["AUTH0_DOMAIN"]}")
    .WithExternalHttpEndpoints()
    .PublishAsDockerFile();

downloaderApi.WithEnvironment("AllowedCorsOrigins__0", web.GetEndpoint("http"));

builder.Build().Run();
