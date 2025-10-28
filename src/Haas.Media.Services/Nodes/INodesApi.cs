namespace Haas.Media.Services.Nodes;

/// <summary>
/// Public API for managing connected nodes
/// </summary>
public interface INodesApi
{
    /// <summary>
    /// Get all connected nodes
    /// </summary>
    Task<IEnumerable<NodeInfo>> GetNodesAsync();

    /// <summary>
    /// Get a specific node by ID
    /// </summary>
    Task<NodeInfo?> GetNodeAsync(string id);

    /// <summary>
    /// Connect to a new node (also registers this node with the remote node)
    /// </summary>
    Task<NodeInfo> ConnectNodeAsync(ConnectNodeRequest request, string currentNodeUrl, string? currentNodeApiKey = null);

    /// <summary>
    /// Register an incoming node connection (called by remote nodes)
    /// </summary>
    Task<NodeInfo> RegisterIncomingNodeAsync(NodeRegistrationData data);

    /// <summary>
    /// Update an existing node
    /// </summary>
    Task<NodeInfo?> UpdateNodeAsync(string id, UpdateNodeRequest request);

    /// <summary>
    /// Delete a node
    /// </summary>
    Task<bool> DeleteNodeAsync(string id);

    /// <summary>
    /// Validate connection to a node
    /// </summary>
    Task<NodeValidationResult> ValidateNodeAsync(string url, string? apiKey = null);

    /// <summary>
    /// Fetch files metadata from a connected node
    /// </summary>
    Task<IEnumerable<Metadata.FileMetadata>> FetchFilesMetadataFromNodeAsync(string nodeId);

    /// <summary>
    /// Start downloading a file from a connected node to a local destination directory as a background task
    /// </summary>
    /// <param name="nodeId">The ID of the node to download from</param>
    /// <param name="remoteFilePath">The file path on the remote node</param>
    /// <param name="destinationDirectory">The local destination directory path (relative to DATA_DIRECTORY) where the file should be saved</param>
    /// <returns>The background task ID for tracking the download</returns>
    Task<string> StartDownloadFileFromNodeAsync(string nodeId, string remoteFilePath, string destinationDirectory);
}
