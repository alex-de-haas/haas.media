using LiteDB;
using System.Text;
using System.Text.Json;
using Haas.Media.Services.Metadata;

namespace Haas.Media.Services.Nodes;

/// <summary>
/// Service for managing connected nodes
/// </summary>
public sealed class NodesService : INodesApi
{
    private readonly ILiteCollection<NodeInfo> _nodesCollection;
    private readonly ILogger<NodesService> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMetadataApi _metadataApi;
    private readonly IConfiguration _configuration;

    public NodesService(
        LiteDatabase database,
        ILogger<NodesService> logger,
        IHttpClientFactory httpClientFactory,
        IMetadataApi metadataApi,
        IConfiguration configuration
    )
    {
        _nodesCollection = database.GetCollection<NodeInfo>("nodes");
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _metadataApi = metadataApi;
        _configuration = configuration;

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

    public async Task<NodeInfo> ConnectNodeAsync(ConnectNodeRequest request, string currentNodeUrl, string? currentNodeApiKey = null)
    {
        _logger.LogInformation("Connecting to new node: {Name} at {Url}", request.Name, request.Url);

        // Validate the connection first
        var validationResult = await ValidateNodeAsync(request.Url, request.DestinationApiKey);
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

        // Register this node with the remote node
        try
        {
            await RegisterWithRemoteNodeAsync(
                request.Url,
                request.DestinationApiKey,
                new NodeRegistrationData
                {
                    Name = GetCurrentNodeName(),
                    Url = currentNodeUrl.TrimEnd('/'),
                    ApiKey = currentNodeApiKey
                }
            );
            _logger.LogInformation("Successfully registered with remote node: {Url}", request.Url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register with remote node: {Url}", request.Url);
            throw new InvalidOperationException(
                $"Connected to node but failed to register: {ex.Message}"
            );
        }

        var node = new NodeInfo
        {
            Name = request.Name,
            Url = request.Url.TrimEnd('/'),
            ApiKey = request.DestinationApiKey,
            LastValidatedAt = DateTime.UtcNow
        };

        _nodesCollection.Insert(node);
        _logger.LogInformation("Successfully connected to node: {Id} ({Name})", node.Id, node.Name);

        return node;
    }

    public Task<NodeInfo> RegisterIncomingNodeAsync(NodeRegistrationData data)
    {
        _logger.LogInformation("Registering incoming node: {Name} at {Url}", data.Name, data.Url);

        // Check if a node with this URL already exists
        var existingNode = _nodesCollection.FindOne(x => x.Url == data.Url);
        if (existingNode != null)
        {
            _logger.LogInformation("Incoming node {Url} already registered, updating last validated time", data.Url);
            existingNode.LastValidatedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(data.ApiKey) && data.ApiKey != existingNode.ApiKey)
            {
                existingNode.ApiKey = data.ApiKey;
            }
            _nodesCollection.Update(existingNode);
            return Task.FromResult(existingNode);
        }

        var node = new NodeInfo
        {
            Name = data.Name,
            Url = data.Url.TrimEnd('/'),
            ApiKey = data.ApiKey,
            LastValidatedAt = DateTime.UtcNow
        };

        _nodesCollection.Insert(node);
        _logger.LogInformation("Successfully registered incoming node: {Id} ({Name})", node.Id, node.Name);

        return Task.FromResult(node);
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

    private async Task RegisterWithRemoteNodeAsync(
        string remoteNodeUrl,
        string? remoteNodeApiKey,
        NodeRegistrationData registrationData
    )
    {
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(10);

        if (!string.IsNullOrWhiteSpace(remoteNodeApiKey))
        {
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", remoteNodeApiKey);
        }

        var registerEndpoint = $"{remoteNodeUrl.TrimEnd('/')}/api/nodes/register";
        var jsonContent = new StringContent(
            System.Text.Json.JsonSerializer.Serialize(registrationData),
            Encoding.UTF8,
            new System.Net.Http.Headers.MediaTypeHeaderValue("application/json")
        );

        _logger.LogDebug("Registering with remote node at {Endpoint}", registerEndpoint);

        var response = await httpClient.PostAsync(registerEndpoint, jsonContent);
        response.EnsureSuccessStatusCode();

        _logger.LogInformation("Successfully registered with remote node: {Url}", remoteNodeUrl);
    }

    private string GetCurrentNodeName()
    {
        // Try to get a friendly name, fallback to hostname
        return Environment.GetEnvironmentVariable("NODE_NAME")
            ?? Environment.MachineName
            ?? "Haas.Media Node";
    }

    public async Task<IEnumerable<Metadata.FileMetadata>> FetchFilesMetadataFromNodeAsync(string nodeId)
    {
        _logger.LogInformation("Fetching files metadata from node: {NodeId}", nodeId);

        var node = _nodesCollection.FindById(nodeId);
        if (node == null)
        {
            _logger.LogWarning("Node not found: {NodeId}", nodeId);
            throw new InvalidOperationException($"Node with ID {nodeId} not found");
        }

        if (!node.IsEnabled)
        {
            _logger.LogWarning("Node is disabled: {NodeId}", nodeId);
            throw new InvalidOperationException($"Node {node.Name} is disabled");
        }

        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        if (!string.IsNullOrWhiteSpace(node.ApiKey))
        {
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", node.ApiKey);
        }

        var metadataEndpoint = $"{node.Url.TrimEnd('/')}/api/metadata/files";
        
        _logger.LogDebug("Fetching files metadata from {Endpoint}", metadataEndpoint);

        try
        {
            var response = await httpClient.GetAsync(metadataEndpoint);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var filesMetadata = System.Text.Json.JsonSerializer.Deserialize<List<Metadata.FileMetadata>>(
                content,
                new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true }
            ) ?? new List<Metadata.FileMetadata>();

            // Set NodeId for all fetched metadata
            foreach (var fileMetadata in filesMetadata)
            {
                fileMetadata.NodeId = nodeId;
            }

            _logger.LogInformation(
                "Successfully fetched {Count} file metadata records from node {NodeName}",
                filesMetadata.Count,
                node.Name
            );

            return filesMetadata;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to fetch files metadata from node {NodeName}: {Message}", node.Name, ex.Message);
            throw new InvalidOperationException($"Failed to fetch metadata from node {node.Name}: {ex.Message}", ex);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse files metadata from node {NodeName}", node.Name);
            throw new InvalidOperationException($"Failed to parse metadata from node {node.Name}", ex);
        }
    }

    public async Task<string> DownloadFileFromNodeAsync(string nodeId, string remoteFilePath, string libraryId)
    {
        _logger.LogInformation(
            "Downloading file from node {NodeId}: {RemoteFilePath} to library {LibraryId}",
            nodeId,
            remoteFilePath,
            libraryId
        );

        // Get the node
        var node = _nodesCollection.FindById(nodeId);
        if (node == null)
        {
            _logger.LogWarning("Node not found: {NodeId}", nodeId);
            throw new InvalidOperationException($"Node with ID {nodeId} not found");
        }

        if (!node.IsEnabled)
        {
            _logger.LogWarning("Node is disabled: {NodeId}", nodeId);
            throw new InvalidOperationException($"Node {node.Name} is disabled");
        }

        // Get the library
        var library = await _metadataApi.GetLibraryAsync(libraryId);
        if (library == null)
        {
            _logger.LogWarning("Library not found: {LibraryId}", libraryId);
            throw new InvalidOperationException($"Library with ID {libraryId} not found");
        }

        // Get the DATA_DIRECTORY path
        var dataDirectory =
            _configuration["DATA_DIRECTORY"]
            ?? throw new InvalidOperationException("DATA_DIRECTORY configuration is required");

        // Build the local destination path
        var libraryPath = Path.Combine(dataDirectory, library.DirectoryPath);
        var fileName = Path.GetFileName(remoteFilePath);
        var localFilePath = Path.Combine(libraryPath, fileName);

        // Ensure the library directory exists
        Directory.CreateDirectory(libraryPath);

        // Download the file from the remote node
        var httpClient = _httpClientFactory.CreateClient();
        httpClient.Timeout = TimeSpan.FromMinutes(30); // Allow longer timeout for file downloads

        if (!string.IsNullOrWhiteSpace(node.ApiKey))
        {
            httpClient.DefaultRequestHeaders.Authorization =
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", node.ApiKey);
        }

        // Build the URL to stream the file from the remote node
        var streamEndpoint = $"{node.Url.TrimEnd('/')}/api/files/stream?path={Uri.EscapeDataString(remoteFilePath)}";

        _logger.LogDebug("Downloading file from {Endpoint}", streamEndpoint);

        try
        {
            var response = await httpClient.GetAsync(streamEndpoint, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            // Stream the file to disk
            await using var contentStream = await response.Content.ReadAsStreamAsync();
            await using var fileStream = new FileStream(localFilePath, FileMode.Create, FileAccess.Write, FileShare.None);
            
            await contentStream.CopyToAsync(fileStream);

            _logger.LogInformation(
                "Successfully downloaded file from node {NodeName} to {LocalFilePath}",
                node.Name,
                localFilePath
            );

            // Return the relative path (relative to DATA_DIRECTORY)
            var relativePath = Path.GetRelativePath(dataDirectory, localFilePath);
            return relativePath;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to download file from node {NodeName}: {Message}", node.Name, ex.Message);
            
            // Clean up partial file if it exists
            if (File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete partial file: {LocalFilePath}", localFilePath);
                }
            }
            
            throw new InvalidOperationException($"Failed to download file from node {node.Name}: {ex.Message}", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error downloading file from node {NodeName}", node.Name);
            
            // Clean up partial file if it exists
            if (File.Exists(localFilePath))
            {
                try
                {
                    File.Delete(localFilePath);
                }
                catch (Exception deleteEx)
                {
                    _logger.LogWarning(deleteEx, "Failed to delete partial file: {LocalFilePath}", localFilePath);
                }
            }
            
            throw new InvalidOperationException($"Unexpected error downloading file from node {node.Name}", ex);
        }
    }
}
