using Haas.Media.Services.Authentication;
using Haas.Media.Services.Infrastructure.BackgroundTasks;
using Haas.Media.Services.Metadata;

namespace Haas.Media.Services.Nodes;

public static class NodesConfiguration
{
    public static WebApplicationBuilder AddNodes(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<INodesApi, NodesService>();

        builder.Services.AddBackgroundTask<
            NodeFileDownloadTask,
            NodeFileDownloadInfo,
            NodeFileDownloadTaskExecutor
        >();

        return builder;
    }

    public static WebApplication UseNodes(this WebApplication app)
    {
        var api = app.MapGroup("/api/nodes").WithTags("Nodes");

        // Get all nodes
        api.MapGet(
                "/",
                async (INodesApi nodesApi) =>
                {
                    var nodes = await nodesApi.GetNodesAsync();
                    return Results.Ok(nodes);
                }
            )
            .WithName("GetNodes")
            .RequireAuthorization();

        // Get a specific node
        api.MapGet(
                "/{id}",
                async (string id, INodesApi nodesApi) =>
                {
                    var node = await nodesApi.GetNodeAsync(id);
                    return node != null ? Results.Ok(node) : Results.NotFound();
                }
            )
            .WithName("GetNode")
            .RequireAuthorization();

        // Connect to a new node
        api.MapPost(
                "/",
                async (
                    ConnectNodeRequest request,
                    INodesApi nodesApi,
                    IAuthenticationApi authApi,
                    HttpContext httpContext,
                    IConfiguration configuration
                ) =>
                {
                    // Validate request
                    if (string.IsNullOrWhiteSpace(request.Name))
                    {
                        return Results.BadRequest(new { error = "Name is required" });
                    }

                    if (string.IsNullOrWhiteSpace(request.Url))
                    {
                        return Results.BadRequest(new { error = "URL is required" });
                    }

                    // Get the current authenticated user
                    var username = httpContext.User.Identity?.Name;
                    if (string.IsNullOrWhiteSpace(username))
                    {
                        return Results.Unauthorized();
                    }

                    var user = authApi.GetUserByUsername(username);
                    if (user == null)
                    {
                        return Results.Unauthorized();
                    }

                    // Destination API key is required (must be provided manually)
                    if (string.IsNullOrWhiteSpace(request.DestinationApiKey))
                    {
                        return Results.BadRequest(
                            new
                            {
                                error = "Destination API key is required. Provide the token from the destination node."
                            }
                        );
                    }

                    // Resolve current node API key (token TO SEND to destination node for callback)
                    string? currentNodeApiKey = null;
                    if (!string.IsNullOrWhiteSpace(request.CurrentNodeTokenId))
                    {
                        var tokens = authApi.GetExternalTokens(user);
                        var selectedToken = tokens.FirstOrDefault(t =>
                            t.Id == request.CurrentNodeTokenId
                        );

                        if (selectedToken == null)
                        {
                            return Results.BadRequest(
                                new
                                {
                                    error = "Current node token not found or does not belong to current user"
                                }
                            );
                        }

                        currentNodeApiKey = selectedToken.Token;
                    }

                    // Current node API key is required for bidirectional authentication
                    if (string.IsNullOrWhiteSpace(currentNodeApiKey))
                    {
                        return Results.BadRequest(
                            new
                            {
                                error = "Current node API key is required. Provide CurrentNodeTokenId to enable bidirectional authentication."
                            }
                        );
                    }

                    // Validate URL format
                    if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri))
                    {
                        return Results.BadRequest(new { error = "Invalid URL format" });
                    }

                    if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
                    {
                        return Results.BadRequest(
                            new { error = "URL must use HTTP or HTTPS scheme" }
                        );
                    }

                    // Get current node URL
                    var currentNodeUrl = GetCurrentNodeUrl(httpContext, configuration);
                    if (string.IsNullOrWhiteSpace(currentNodeUrl))
                    {
                        return Results.BadRequest(
                            new
                            {
                                error = "Cannot determine current node URL. Set NODE_URL environment variable or configure public URL."
                            }
                        );
                    }

                    try
                    {
                        var node = await nodesApi.ConnectNodeAsync(
                            request,
                            currentNodeUrl,
                            currentNodeApiKey
                        );
                        return Results.Created($"/api/nodes/{node.Id}", node);
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { error = ex.Message });
                    }
                }
            )
            .WithName("ConnectNode")
            .RequireAuthorization();

        // Register an incoming node connection
        _ = api.MapPost(
                "/register",
                async (NodeRegistrationData data, INodesApi nodesApi) =>
                {
                    // Validate request
                    if (string.IsNullOrWhiteSpace(data.Name))
                    {
                        return Results.BadRequest(new { error = "Name is required" });
                    }

                    if (string.IsNullOrWhiteSpace(data.Url))
                    {
                        return Results.BadRequest(new { error = "URL is required" });
                    }

                    // Validate URL format
                    if (!Uri.TryCreate(data.Url, UriKind.Absolute, out var uri))
                    {
                        return Results.BadRequest(new { error = "Invalid URL format" });
                    }

                    if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
                    {
                        return Results.BadRequest(
                            new { error = "URL must use HTTP or HTTPS scheme" }
                        );
                    }

                    try
                    {
                        var node = await nodesApi.RegisterIncomingNodeAsync(data);
                        return Results.Created($"/api/nodes/{node.Id}", node);
                    }
                    catch (Exception ex)
                    {
                        return Results.BadRequest(new { error = ex.Message });
                    }
                }
            )
            .WithName("RegisterNode")
            .RequireAuthorization(AuthorizationPolicies.AllowExternalToken);

        // Update a node
        api.MapPut(
                "/{id}",
                async (string id, UpdateNodeRequest request, INodesApi nodesApi) =>
                {
                    // Validate URL if provided
                    if (
                        request.Url != null
                        && !Uri.TryCreate(request.Url, UriKind.Absolute, out var uri)
                    )
                    {
                        return Results.BadRequest(new { error = "Invalid URL format" });
                    }

                    if (
                        request.Url != null
                        && Uri.TryCreate(request.Url, UriKind.Absolute, out var validUri)
                        && validUri.Scheme != Uri.UriSchemeHttp
                        && validUri.Scheme != Uri.UriSchemeHttps
                    )
                    {
                        return Results.BadRequest(
                            new { error = "URL must use HTTP or HTTPS scheme" }
                        );
                    }

                    try
                    {
                        var node = await nodesApi.UpdateNodeAsync(id, request);
                        return node != null ? Results.Ok(node) : Results.NotFound();
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { error = ex.Message });
                    }
                }
            )
            .WithName("UpdateNode")
            .RequireAuthorization();

        // Delete a node
        api.MapDelete(
                "/{id}",
                async (string id, INodesApi nodesApi) =>
                {
                    var deleted = await nodesApi.DeleteNodeAsync(id);
                    return deleted ? Results.Ok() : Results.NotFound();
                }
            )
            .WithName("DeleteNode")
            .RequireAuthorization();

        // Validate a node connection
        api.MapPost(
                "/validate",
                async (ValidateNodeRequest request, INodesApi nodesApi) =>
                {
                    if (string.IsNullOrWhiteSpace(request.Url))
                    {
                        return Results.BadRequest(new { error = "URL is required" });
                    }

                    if (!Uri.TryCreate(request.Url, UriKind.Absolute, out var uri))
                    {
                        return Results.BadRequest(new { error = "Invalid URL format" });
                    }

                    if (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
                    {
                        return Results.BadRequest(
                            new { error = "URL must use HTTP or HTTPS scheme" }
                        );
                    }

                    var result = await nodesApi.ValidateNodeAsync(request.Url, request.ApiKey);
                    return Results.Ok(result);
                }
            )
            .WithName("ValidateNode")
            .RequireAuthorization();

        // Fetch files metadata from a connected node
        api.MapPost(
                "/{id}/fetch-metadata",
                async (string id, INodesApi nodesApi, IMetadataApi metadataApi) =>
                {
                    try
                    {
                        var filesMetadata = await nodesApi.FetchFilesMetadataFromNodeAsync(id);

                        // Get all existing file metadata for this node from local database
                        var allExistingFiles = await metadataApi.GetFileMetadataAsync();
                        var existingNodeFiles = allExistingFiles
                            .Where(f => f.NodeId == id)
                            .ToList();

                        // Create a set of fetched file paths for efficient lookup
                        var fetchedFilePaths = new HashSet<string>(
                            filesMetadata.Select(f => f.FilePath)
                        );

                        // Identify and remove stale metadata (files that no longer exist on the node)
                        var deletedCount = 0;
                        foreach (var existingFile in existingNodeFiles)
                        {
                            if (!fetchedFilePaths.Contains(existingFile.FilePath))
                            {
                                // File no longer exists on the node, remove the metadata
                                if (await metadataApi.DeleteFileMetadataAsync(existingFile.Id))
                                {
                                    deletedCount++;
                                }
                            }
                        }

                        // Save fetched metadata to local database
                        var savedCount = 0;
                        foreach (var fileMetadata in filesMetadata)
                        {
                            // Check if this file metadata already exists (same MediaId, NodeId, and FilePath)
                            var existingFiles = await metadataApi.GetFileMetadataAsync(
                                fileMetadata.TmdbId
                            );
                            var exists = existingFiles.Any(f =>
                                f.NodeId == fileMetadata.NodeId
                                && f.FilePath == fileMetadata.FilePath
                            );

                            if (!exists)
                            {
                                await metadataApi.AddFileMetadataAsync(fileMetadata);
                                savedCount++;
                            }
                        }

                        return Results.Ok(
                            new
                            {
                                totalFetched = filesMetadata.Count(),
                                savedCount,
                                skippedCount = filesMetadata.Count() - savedCount,
                                deletedCount
                            }
                        );
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { error = ex.Message });
                    }
                }
            )
            .WithName("FetchNodeMetadata")
            .RequireAuthorization();

        // Download a file from a connected node
        api.MapPost(
                "/{nodeId}/download-file",
                async (string nodeId, DownloadFileRequest request, INodesApi nodesApi) =>
                {
                    if (string.IsNullOrWhiteSpace(request.RemoteFilePath))
                    {
                        return Results.BadRequest(new { error = "Remote file path is required" });
                    }

                    if (string.IsNullOrWhiteSpace(request.LibraryId))
                    {
                        return Results.BadRequest(new { error = "Library ID is required" });
                    }

                    try
                    {
                        var taskId = await nodesApi.StartDownloadFileFromNodeAsync(
                            nodeId,
                            request.RemoteFilePath,
                            request.LibraryId,
                            request.CustomFileName,
                            request.TvShowTitle,
                            request.SeasonNumber
                        );
                        return Results.Ok(new { taskId });
                    }
                    catch (InvalidOperationException ex)
                    {
                        return Results.BadRequest(new { error = ex.Message });
                    }
                }
            )
            .WithName("DownloadFileFromNode")
            .RequireAuthorization();

        return app;
    }

    private static string? GetCurrentNodeUrl(HttpContext httpContext, IConfiguration configuration)
    {
        // Priority order:
        // 1. NODE_URL environment variable (explicitly configured)
        // 2. Inferred from current request
        var configuredUrl = configuration["NODE_URL"];
        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            return configuredUrl.TrimEnd('/');
        }

        // Try to infer from the current request
        var request = httpContext.Request;
        var scheme = request.Scheme;
        var host = request.Host.Value;

        // Don't use localhost for node-to-node communication
        if (
            !string.IsNullOrWhiteSpace(host)
            && (
                host.StartsWith("localhost", StringComparison.OrdinalIgnoreCase)
                || host.StartsWith("127.0.0.1")
            )
        )
        {
            return null;
        }

        return $"{scheme}://{host}";
    }
}

/// <summary>
/// Request to validate a node connection
/// </summary>
public sealed record ValidateNodeRequest
{
    public required string Url { get; init; }
    public string? ApiKey { get; init; }
}

/// <summary>
/// Request to download a file from a connected node
/// </summary>
public sealed record DownloadFileRequest
{
    public required string RemoteFilePath { get; init; }
    public required string LibraryId { get; init; }
    public string? CustomFileName { get; init; }
    public string? TvShowTitle { get; init; }
    public int? SeasonNumber { get; init; }
}
