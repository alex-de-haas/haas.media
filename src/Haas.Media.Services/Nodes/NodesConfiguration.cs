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
                async (ConnectNodeRequest request, INodesApi nodesApi) =>
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

                    try
                    {
                        var node = await nodesApi.ConnectNodeAsync(request);
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
}

/// <summary>
/// Request to validate a node connection
/// </summary>
public sealed record ValidateNodeRequest
{
    public required string Url { get; init; }
    public string? ApiKey { get; init; }
}
