var builder = DistributedApplication.CreateBuilder(args);

var downloaderApi = builder
    .AddProject<Projects.Haas_Media_Downloader_Api>("downloader-api")
    .WithOtlpExporter();
builder
    .AddNpmApp("web", "../Haas.Media.Web", scriptName: "dev")
    .WithExternalHttpEndpoints()
    .WithHttpEndpoint(port: 3000, targetPort: 3000, isProxied: false)
    .WithEnvironment("API_DOWNLOADER_URL", downloaderApi.GetEndpoint("http"))
    .PublishAsDockerFile();

builder.Build().Run();
