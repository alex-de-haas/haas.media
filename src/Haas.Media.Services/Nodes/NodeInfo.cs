namespace Haas.Media.Services.Nodes;

/// <summary>
/// Represents a connected media server node
/// </summary>
public sealed class NodeInfo
{
    /// <summary>
    /// Unique identifier for the node
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Display name for the node
    /// </summary>
    public required string Name { get; set; }

    /// <summary>
    /// Base URL for the node (e.g., "http://192.168.1.100:8000")
    /// </summary>
    public required string Url { get; set; }

    /// <summary>
    /// API key or token for authentication with the node
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// When the node was added
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last time the node was successfully validated
    /// </summary>
    public DateTime? LastValidatedAt { get; set; }

    /// <summary>
    /// Whether the node is currently enabled
    /// </summary>
    public bool IsEnabled { get; set; } = true;

    /// <summary>
    /// Additional metadata about the node
    /// </summary>
    public Dictionary<string, string> Metadata { get; set; } = new();
}

/// <summary>
/// Request to connect to a new node
/// </summary>
public sealed record ConnectNodeRequest
{
    public required string Name { get; init; }
    public required string Url { get; init; }
    public string? ApiKey { get; init; }
    /// <summary>
    /// ID of an existing external token to use for authentication
    /// </summary>
    public string? TokenId { get; init; }
}

/// <summary>
/// Data sent when registering this node with a remote node
/// </summary>
public sealed record NodeRegistrationData
{
    public required string Name { get; init; }
    public required string Url { get; init; }
    public string? ApiKey { get; init; }
}

/// <summary>
/// Request to update a node
/// </summary>
public sealed record UpdateNodeRequest
{
    public string? Name { get; init; }
    public string? Url { get; init; }
    public string? ApiKey { get; init; }
    public bool? IsEnabled { get; init; }
}

/// <summary>
/// Response from validating a node connection
/// </summary>
public sealed record NodeValidationResult
{
    public required bool IsValid { get; init; }
    public string? ErrorMessage { get; init; }
    public Dictionary<string, string>? SystemInfo { get; init; }
}
