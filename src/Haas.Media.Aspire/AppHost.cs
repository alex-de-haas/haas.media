var env = DotNetEnv.Env.LoadMulti([".env.local"]).ToDictionary();

var builder = DistributedApplication.CreateBuilder(args);

var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithEnvironment("AUTH0_DOMAIN", env["AUTH0_DOMAIN"])
    .WithEnvironment("AUTH0_AUDIENCE", env["AUTH0_AUDIENCE"])
    .WithOtlpExporter();
builder
    .AddNpmApp("web", "../Haas.Media.Web", scriptName: "dev")
    .WithExternalHttpEndpoints()
    .WithHttpEndpoint(port: 3000, targetPort: 3000, isProxied: false)
    .WithEnvironment("NEXT_PUBLIC_DOWNLOADER_URL", downloaderApi.GetEndpoint("http"))
    .WithEnvironment("AUTH0_DOMAIN", env["AUTH0_DOMAIN"])
    .WithEnvironment("AUTH0_AUDIENCE", env["AUTH0_AUDIENCE"])
    .WithEnvironment("AUTH0_SECRET", env["AUTH0_SECRET"])
    .WithEnvironment("AUTH0_BASE_URL", env["AUTH0_BASE_URL"])
    .WithEnvironment("AUTH0_CLIENT_ID", env["AUTH0_CLIENT_ID"])
    .WithEnvironment("AUTH0_CLIENT_SECRET", env["AUTH0_CLIENT_SECRET"])
    .WithEnvironment("AUTH0_ISSUER_BASE_URL", $"https://{env["AUTH0_DOMAIN"]}") // derived from domain
    .PublishAsDockerFile();

builder.Build().Run();
