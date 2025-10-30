# Nodes API - Connected Media Servers

## Overview

The Nodes feature allows a Haas.Media instance to connect to and manage other Haas.Media server instances (nodes). This enables distributed media management and federation capabilities.

## Architecture

### Components

```
Nodes/
├── NodesConfiguration.cs    # Endpoint registration & validation
├── NodesService.cs          # Business logic
├── INodesApi.cs            # Public service interface
└── NodeInfo.cs             # Data models
```

### Database

Nodes are stored in the LiteDB `nodes` collection with the following indexes:

- `Id` (unique)
- `Name`
- `Url`

## API Endpoints

All endpoints require authorization and are prefixed with `/api/nodes`.

### GET /api/nodes

Get all connected nodes.

**Response:** `200 OK`

```json
[
  {
    "id": "abc-123",
    "name": "Living Room Server",
    "url": "http://192.168.1.100:8000",
    "apiKey": "***",
    "createdAt": "2025-10-27T10:00:00Z",
    "lastValidatedAt": "2025-10-27T10:00:00Z",
    "isEnabled": true,
    "metadata": {
      "hasMetadataApi": "true"
    }
  }
]
```

### GET /api/nodes/{id}

Get a specific node by ID.

**Response:** `200 OK` or `404 Not Found`

### POST /api/nodes

Connect to a new node. Validates the connection and automatically registers this node with the remote node (bidirectional handshake).

**Request Body:**

```json
{
  "name": "Living Room Server",
  "url": "http://192.168.1.100:8000",
  "apiKey": "optional-api-key"
}
```

**Validation:**

- Name is required
- URL is required and must be valid HTTP/HTTPS
- Connection is tested against `/health` endpoint
- Duplicate URLs are rejected
- Current node URL must be configured (via `NODE_URL` env var or inferred from request)

**Bidirectional Connection:**
When connecting to a remote node, this endpoint automatically:

1. Validates the remote node is accessible
2. Calls `/api/nodes/register` on the remote node to register this node
3. Stores the remote node locally

This creates a bidirectional connection where both nodes know about each other.

**Configuration:**
Set `NODE_URL` environment variable to define this node's public URL for node-to-node communication:

```bash
NODE_URL=http://192.168.1.50:8000
```

Optionally set `NODE_NAME` to customize this node's display name when registering with remote nodes:

```bash
NODE_NAME="Main Media Server"
```

Optionally set `NODE_API_KEY` if this node requires authentication:

```bash
NODE_API_KEY="your-api-key-for-this-node"
```

**Response:** `201 Created` or `400 Bad Request`

### PUT /api/nodes/{id}

Update an existing node. Re-validates connection if URL changes.

**Request Body:** (all fields optional)

```json
{
  "name": "Updated Name",
  "url": "http://192.168.1.101:8000",
  "apiKey": "new-api-key",
  "isEnabled": false
}
```

**Response:** `200 OK`, `400 Bad Request`, or `404 Not Found`

### DELETE /api/nodes/{id}

Delete a node.

**Response:** `200 OK` or `404 Not Found`

### POST /api/nodes/register

Register an incoming node connection. This endpoint is called automatically by remote nodes when they connect to this node.

**Request Body:**

```json
{
  "name": "Remote Server",
  "url": "http://192.168.1.100:8000",
  "apiKey": "optional-api-key"
}
```

**Behavior:**

- If the node URL already exists, updates the last validated time
- If it's a new node, creates a new entry with metadata indicating it was registered via incoming connection
- Requires authentication (same as other endpoints)

**Response:** `201 Created` or `400 Bad Request`

### POST /api/nodes/validate

Validate a connection to a node without saving it. Useful for testing connectivity before adding a node.

**Request Body:**

```json
{
  "url": "http://192.168.1.100:8000",
  "apiKey": "optional-api-key"
}
```

**Response:** `200 OK`

```json
{
  "isValid": true,
  "errorMessage": null,
  "systemInfo": {
    "hasMetadataApi": "true"
  }
}
```

Or on failure:

```json
{
  "isValid": false,
  "errorMessage": "Connection timeout (10 seconds)",
  "systemInfo": null
}
```

## Node Validation

When connecting to or updating a node, the service validates the connection by:

1. **Health Check:** Calls `{url}/health` with a 10-second timeout
2. **Authentication:** Uses Bearer token if `apiKey` is provided
3. **Verification:** Optionally checks `/api/metadata/libraries` to confirm it's a Haas.Media instance
4. **Metadata Collection:** Stores system information for reference
5. **Bidirectional Registration:** When connecting (POST /api/nodes), automatically registers this node with the remote node

### Validation Errors

Common validation failures:

- `Connection timeout (10 seconds)` - Node is unreachable or slow
- `Health check returned status code: 401` - Invalid API key
- `Connection failed: No such host is known` - Invalid hostname/IP
- `A node with URL {url} already exists` - Duplicate URL
- `Cannot determine current node URL` - NODE_URL not configured and request is from localhost

## Usage Examples

### Connect to a Node

```bash
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Remote Server",
    "url": "http://192.168.1.100:8000",
    "apiKey": "remote-server-api-key"
  }'
```

### Validate Before Connecting

```bash
curl -X POST http://localhost:8000/api/nodes/validate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://192.168.1.100:8000",
    "apiKey": "test-key"
  }'
```

### List All Nodes

```bash
curl http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Disable a Node

```bash
curl -X PUT http://localhost:8000/api/nodes/abc-123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": false
  }'
```

### Delete a Node

```bash
curl -X DELETE http://localhost:8000/api/nodes/abc-123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security Considerations

1. **API Keys:** Stored in plaintext in the database - consider encryption for production
2. **Authentication:** All endpoints require authorization via JWT
3. **Network Security:** Nodes communicate over HTTP/HTTPS - use HTTPS in production
4. **Validation:** Connection validation has a 10-second timeout to prevent hanging

## Future Enhancements

Potential features for the Nodes API:

- **Content Synchronization:** Sync metadata or files between nodes
- **Load Balancing:** Distribute requests across multiple nodes
- **Federated Search:** Search across all connected nodes
- **Health Monitoring:** Periodic health checks with status tracking
- **Node Discovery:** Auto-discover nodes on the local network
- **API Key Encryption:** Encrypt API keys at rest
- **Certificate Validation:** Validate SSL certificates for HTTPS nodes
- **Node Metrics:** Track bandwidth, latency, and usage statistics

## Integration with Existing Features

The Nodes API is designed to work alongside existing features:

- **Metadata:** Could sync metadata across nodes
- **Files:** Could stream files from remote nodes
- **Background Tasks:** Could trigger tasks on remote nodes
- **SignalR:** Could relay real-time updates across nodes

## Development Notes

Following the established feature module pattern:

1. **Service Registration:** `builder.AddNodes()` in `Program.cs`
2. **Endpoint Registration:** `app.UseNodes()` in `Program.cs`
3. **LiteDB Collection:** `nodes` collection with indexes
4. **Dependency Injection:** `INodesApi` interface exposed
5. **Minimal APIs:** All endpoints use minimal API pattern
6. **Error Handling:** Proper HTTP status codes and error messages
7. **Logging:** Comprehensive logging throughout
