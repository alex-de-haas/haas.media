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
}
