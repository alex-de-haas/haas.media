namespace Haas.Media.Services.Nodes;

public static class NodesConfiguration
{
    public static WebApplicationBuilder AddNodes(this WebApplicationBuilder builder)
    {
        builder.Services.AddSingleton<INodesApi, NodesService>();

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

                    // ApiKey must be an external token (not a regular JWT)
                    if (string.IsNullOrWhiteSpace(request.ApiKey))
                    {
                        return Results.BadRequest(
                            new
                            {
                                error =
                                    "API Key is required. Use an external token from /api/auth/tokens endpoint."
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
                                error =
                                    "Cannot determine current node URL. Set NODE_URL environment variable or configure public URL."
                            }
                        );
                    }

                    // Get current node API key from authenticated user's external token
                    // Extract from Authorization header
                    var currentNodeApiKey = httpContext.Request.Headers.Authorization
                        .ToString()
                        .Replace("Bearer ", "");

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
        api.MapPost(
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
            .RequireAuthorization(Authentication.AuthorizationPolicies.AllowExternalToken);

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
        if (!string.IsNullOrWhiteSpace(host)
            && (host.StartsWith("localhost", StringComparison.OrdinalIgnoreCase)
                || host.StartsWith("127.0.0.1")))
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
