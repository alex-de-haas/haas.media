using LiteDB;

namespace Haas.Media.Services.Nodes;

/// <summary>
/// Service for managing connected nodes
/// </summary>
public sealed class NodesService : INodesApi
{
    private readonly ILiteCollection<NodeInfo> _nodesCollection;
    private readonly ILogger<NodesService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;

    public NodesService(
        LiteDatabase database,
        ILogger<NodesService> logger,
        IHttpClientFactory httpClientFactory
    )
    {
        _nodesCollection = database.GetCollection<NodeInfo>("nodes");
        _logger = logger;
        _httpClientFactory = httpClientFactory;

        CreateIndexes();

        _logger.LogInformation("NodesService initialized");
    }

    private void CreateIndexes()
    {
        _nodesCollection.EnsureIndex(x => x.Id, unique: true);
        _nodesCollection.EnsureIndex(x => x.Name);
        _nodesCollection.EnsureIndex(x => x.Url);
    }

    public Task<IEnumerable<NodeInfo>> GetNodesAsync()
    {
        var nodes = _nodesCollection.FindAll().ToList();
        _logger.LogDebug("Retrieved {Count} nodes", nodes.Count);
        return Task.FromResult<IEnumerable<NodeInfo>>(nodes);
    }

    public Task<NodeInfo?> GetNodeAsync(string id)
    {
        var node = _nodesCollection.FindById(id);
        if (node == null)
        {
            _logger.LogWarning("Node not found: {Id}", id);
        }
        return Task.FromResult(node);
    }

    public async Task<NodeInfo> ConnectNodeAsync(ConnectNodeRequest request)
    {
        _logger.LogInformation("Connecting to new node: {Name} at {Url}", request.Name, request.Url);

        // Validate the connection first
        var validationResult = await ValidateNodeAsync(request.Url, request.ApiKey);
        if (!validationResult.IsValid)
        {
            _logger.LogError(
                "Failed to validate node connection: {ErrorMessage}",
                validationResult.ErrorMessage
            );
            throw new InvalidOperationException(
                $"Cannot connect to node: {validationResult.ErrorMessage}"
            );
        }

        // Check if a node with this URL already exists
        var existingNode = _nodesCollection.FindOne(x => x.Url == request.Url);
        if (existingNode != null)
        {
            _logger.LogWarning("Node with URL {Url} already exists", request.Url);
            throw new InvalidOperationException($"A node with URL {request.Url} already exists");
        }

        var node = new NodeInfo
        {
            Name = request.Name,
            Url = request.Url.TrimEnd('/'),
            ApiKey = request.ApiKey,
            LastValidatedAt = DateTime.UtcNow,
            Metadata = validationResult.SystemInfo ?? new Dictionary<string, string>()
        };

        _nodesCollection.Insert(node);
        _logger.LogInformation("Successfully connected to node: {Id} ({Name})", node.Id, node.Name);

        return node;
    }

    public async Task<NodeInfo?> UpdateNodeAsync(string id, UpdateNodeRequest request)
    {
        var node = _nodesCollection.FindById(id);
        if (node == null)
        {
            _logger.LogWarning("Node not found for update: {Id}", id);
            return null;
        }

        var hasChanges = false;

        if (request.Name != null && request.Name != node.Name)
        {
            node.Name = request.Name;
            hasChanges = true;
        }

        if (request.Url != null && request.Url != node.Url)
        {
            // Validate new URL
            var validationResult = await ValidateNodeAsync(request.Url, request.ApiKey ?? node.ApiKey);
            if (!validationResult.IsValid)
            {
                throw new InvalidOperationException(
                    $"Cannot update node URL: {validationResult.ErrorMessage}"
                );
            }

            node.Url = request.Url.TrimEnd('/');
            node.LastValidatedAt = DateTime.UtcNow;
            if (validationResult.SystemInfo != null)
            {
                node.Metadata = validationResult.SystemInfo;
            }
            hasChanges = true;
        }

        if (request.ApiKey != null && request.ApiKey != node.ApiKey)
        {
            node.ApiKey = request.ApiKey;
            hasChanges = true;
        }

        if (request.IsEnabled.HasValue && request.IsEnabled.Value != node.IsEnabled)
        {
            node.IsEnabled = request.IsEnabled.Value;
            hasChanges = true;
        }

        if (hasChanges)
        {
            _nodesCollection.Update(node);
            _logger.LogInformation("Updated node: {Id} ({Name})", node.Id, node.Name);
        }

        return node;
    }

    public Task<bool> DeleteNodeAsync(string id)
    {
        var deleted = _nodesCollection.Delete(id);
        if (deleted)
        {
            _logger.LogInformation("Deleted node: {Id}", id);
        }
        else
        {
            _logger.LogWarning("Node not found for deletion: {Id}", id);
        }
        return Task.FromResult(deleted);
    }

    public async Task<NodeValidationResult> ValidateNodeAsync(string url, string? apiKey = null)
    {
        try
        {
            var normalizedUrl = url.TrimEnd('/');
            var healthEndpoint = $"{normalizedUrl}/health";

            var httpClient = _httpClientFactory.CreateClient();
            httpClient.Timeout = TimeSpan.FromSeconds(10);

            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                httpClient.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            }

            _logger.LogDebug("Validating node connection to {Url}", healthEndpoint);

            var response = await httpClient.GetAsync(healthEndpoint);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning(
                    "Node validation failed with status {StatusCode}",
                    response.StatusCode
                );
                return new NodeValidationResult
                {
                    IsValid = false,
                    ErrorMessage = $"Health check returned status code: {response.StatusCode}"
                };
            }

            // Try to get system info from /api/metadata/libraries to verify it's a Haas.Media instance
            var systemInfo = new Dictionary<string, string>();
            try
            {
                var librariesEndpoint = $"{normalizedUrl}/api/metadata/libraries";
                var librariesResponse = await httpClient.GetAsync(librariesEndpoint);
                if (librariesResponse.IsSuccessStatusCode)
                {
                    systemInfo["hasMetadataApi"] = "true";
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug("Could not fetch libraries from node: {Message}", ex.Message);
            }

            _logger.LogInformation("Successfully validated node connection to {Url}", normalizedUrl);

            return new NodeValidationResult
            {
                IsValid = true,
                SystemInfo = systemInfo
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error while validating node connection to {Url}", url);
            return new NodeValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Connection failed: {ex.Message}"
            };
        }
        catch (TaskCanceledException)
        {
            _logger.LogError("Timeout while validating node connection to {Url}", url);
            return new NodeValidationResult
            {
                IsValid = false,
                ErrorMessage = "Connection timeout (10 seconds)"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error while validating node connection to {Url}", url);
            return new NodeValidationResult
            {
                IsValid = false,
                ErrorMessage = $"Unexpected error: {ex.Message}"
            };
        }
    }
}
