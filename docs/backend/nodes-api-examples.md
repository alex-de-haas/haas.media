# Nodes API - Quick Start Examples

## Configuration

Before connecting nodes, configure the current node's public URL:

```bash
# .env file or environment variables
NODE_URL=http://192.168.1.50:8000      # This node's public URL
NODE_NAME="Main Media Server"          # Optional: Custom name for this node
NODE_API_KEY="your-api-key"            # Optional: API key for this node
```

**Important:** `NODE_URL` must be accessible from other nodes. Don't use `localhost` or `127.0.0.1`.

## Testing with cURL

These examples assume you're running the API at `http://localhost:8000` and have a valid JWT token.

### 1. Validate a Node Connection

Before adding a node, test the connection:

```bash
curl -X POST http://localhost:8000/api/nodes/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://192.168.1.100:8000"
  }'
```

**Expected Response:**
```json
{
  "isValid": true,
  "errorMessage": null,
  "systemInfo": {
    "hasMetadataApi": "true"
  }
}
```

### 2. Connect to a Node

Once validated, add the node. This will automatically register your node with the remote server:

```bash
# Make sure NODE_URL is configured first!
export NODE_URL=http://192.168.1.50:8000

curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Living Room Server",
    "url": "http://192.168.1.100:8000",
    "apiKey": "optional-api-key-here"
  }'
```

**What happens:**
1. Validates connection to `http://192.168.1.100:8000`
2. Calls `http://192.168.1.100:8000/api/nodes/register` to register this node
3. Stores the remote node locally

**Expected Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Living Room Server",
  "url": "http://192.168.1.100:8000",
  "apiKey": "optional-api-key-here",
  "createdAt": "2025-10-27T10:30:00Z",
  "lastValidatedAt": "2025-10-27T10:30:00Z",
  "isEnabled": true,
  "metadata": {
    "hasMetadataApi": "true"
  }
}
```

### 3. List All Nodes

```bash
curl http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Living Room Server",
    "url": "http://192.168.1.100:8000",
    "apiKey": "***",
    "createdAt": "2025-10-27T10:30:00Z",
    "lastValidatedAt": "2025-10-27T10:30:00Z",
    "isEnabled": true,
    "metadata": {
      "hasMetadataApi": "true"
    }
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "name": "Bedroom Server",
    "url": "http://192.168.1.101:8000",
    "apiKey": null,
    "createdAt": "2025-10-27T11:00:00Z",
    "lastValidatedAt": "2025-10-27T11:00:00Z",
    "isEnabled": true,
    "metadata": {}
  }
]
```

### 4. Get a Specific Node

```bash
curl http://localhost:8000/api/nodes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Update a Node

```bash
curl -X PUT http://localhost:8000/api/nodes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Living Room Server",
    "isEnabled": true
  }'
```

### 6. Disable a Node

```bash
curl -X PUT http://localhost:8000/api/nodes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isEnabled": false
  }'
```

### 7. Delete a Node

```bash
curl -X DELETE http://localhost:8000/api/nodes/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Error Handling Examples

### Invalid URL Format

```bash
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Server",
    "url": "not-a-valid-url"
  }'
```

**Response:** `400 Bad Request`
```json
{
  "error": "Invalid URL format"
}
```

### Missing NODE_URL Configuration

```bash
# If NODE_URL is not set and request is from localhost
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Remote Server",
    "url": "http://192.168.1.100:8000"
  }'
```

**Response:** `400 Bad Request`
```json
{
  "error": "Cannot determine current node URL. Set NODE_URL environment variable or configure public URL."
}
```

### Connection Timeout

```bash
curl -X POST http://localhost:8000/api/nodes/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://192.168.1.200:8000"
  }'
```

**Response:** `200 OK`
```json
{
  "isValid": false,
  "errorMessage": "Connection timeout (10 seconds)",
  "systemInfo": null
}
```

### Duplicate Node

```bash
# Trying to connect to a node that's already connected
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Another Server",
    "url": "http://192.168.1.100:8000"
  }'
```

**Response:** `400 Bad Request`
```json
{
  "error": "A node with URL http://192.168.1.100:8000 already exists"
}
```

### Registration Failed

```bash
# If the remote node rejects the registration
curl -X POST http://localhost:8000/api/nodes \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Remote Server",
    "url": "http://192.168.1.100:8000"
  }'
```

**Response:** `400 Bad Request`
```json
{
  "error": "Connected to node but failed to register: <error details>"
}
```

### Node Not Found

```bash
curl http://localhost:8000/api/nodes/non-existent-id \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `404 Not Found`

## Integration Examples

### Using with JavaScript/TypeScript

```typescript
// types.ts
interface NodeInfo {
  id: string;
  name: string;
  url: string;
  apiKey?: string;
  createdAt: string;
  lastValidatedAt?: string;
  isEnabled: boolean;
  metadata: Record<string, string>;
}

interface ConnectNodeRequest {
  name: string;
  url: string;
  apiKey?: string;
}

interface NodeValidationResult {
  isValid: boolean;
  errorMessage?: string;
  systemInfo?: Record<string, string>;
}

// api.ts
const API_BASE = 'http://localhost:8000';

async function validateNode(url: string, apiKey?: string): Promise<NodeValidationResult> {
  const response = await fetch(`${API_BASE}/api/nodes/validate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, apiKey }),
  });
  
  return await response.json();
}

async function connectNode(request: ConnectNodeRequest): Promise<NodeInfo> {
  const response = await fetch(`${API_BASE}/api/nodes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to connect node');
  }
  
  return await response.json();
}

async function getNodes(): Promise<NodeInfo[]> {
  const response = await fetch(`${API_BASE}/api/nodes`, {
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  return await response.json();
}

async function deleteNode(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/nodes/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete node');
  }
}

function getToken(): string {
  // Implement your token retrieval logic
  return localStorage.getItem('token') || '';
}
```

### Using with Python

```python
import requests
from typing import Optional, List, Dict

API_BASE = "http://localhost:8000"

class NodesClient:
    def __init__(self, token: str):
        self.token = token
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
    
    def validate_node(self, url: str, api_key: Optional[str] = None) -> Dict:
        response = requests.post(
            f"{API_BASE}/api/nodes/validate",
            headers=self.headers,
            json={"url": url, "apiKey": api_key}
        )
        response.raise_for_status()
        return response.json()
    
    def connect_node(self, name: str, url: str, api_key: Optional[str] = None) -> Dict:
        response = requests.post(
            f"{API_BASE}/api/nodes",
            headers=self.headers,
            json={"name": name, "url": url, "apiKey": api_key}
        )
        response.raise_for_status()
        return response.json()
    
    def get_nodes(self) -> List[Dict]:
        response = requests.get(
            f"{API_BASE}/api/nodes",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def get_node(self, node_id: str) -> Dict:
        response = requests.get(
            f"{API_BASE}/api/nodes/{node_id}",
            headers=self.headers
        )
        response.raise_for_status()
        return response.json()
    
    def update_node(self, node_id: str, **kwargs) -> Dict:
        response = requests.put(
            f"{API_BASE}/api/nodes/{node_id}",
            headers=self.headers,
            json=kwargs
        )
        response.raise_for_status()
        return response.json()
    
    def delete_node(self, node_id: str) -> None:
        response = requests.delete(
            f"{API_BASE}/api/nodes/{node_id}",
            headers=self.headers
        )
        response.raise_for_status()

# Usage
client = NodesClient("your-jwt-token")

# Validate first
result = client.validate_node("http://192.168.1.100:8000")
if result["isValid"]:
    # Connect
    node = client.connect_node(
        name="Living Room Server",
        url="http://192.168.1.100:8000"
    )
    print(f"Connected: {node['id']}")
    
    # List all
    nodes = client.get_nodes()
    print(f"Total nodes: {len(nodes)}")
```

## Workflow Example

### Complete Node Management Workflow

**Setup: Configure both nodes**

Node A (192.168.1.50:8000):
```bash
export NODE_URL=http://192.168.1.50:8000
export NODE_NAME="Main Server"
export NODE_API_KEY="main-server-key"
```

Node B (192.168.1.100:8000):
```bash
export NODE_URL=http://192.168.1.100:8000
export NODE_NAME="Living Room Server"
export NODE_API_KEY="living-room-key"
```

**From Node A, connect to Node B:**

1. **Validate Connection**
   ```bash
   curl -X POST http://localhost:8000/api/nodes/validate \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"url": "http://192.168.1.100:8000"}'
   ```

2. **Connect if Valid (creates bidirectional connection)**
   ```bash
   # On Node A
   curl -X POST http://192.168.1.50:8000/api/nodes \
     -H "Authorization: Bearer $TOKEN_A" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Living Room Server",
       "url": "http://192.168.1.100:8000",
       "apiKey": "living-room-key"
     }'
   ```
   
   This will:
   - Validate Node B is accessible
   - Register Node A on Node B (via /api/nodes/register)
   - Store Node B on Node A
   
   **Result:** Both nodes now have each other in their node list!

3. **List and Verify on Both Nodes**
   ```bash
   # On Node A
   curl http://192.168.1.50:8000/api/nodes \
     -H "Authorization: Bearer $TOKEN_A"
   
   # On Node B  
   curl http://192.168.1.100:8000/api/nodes \
     -H "Authorization: Bearer $TOKEN_B"
   ```
   
   Both should show the other node in their list!

4. **Update Configuration**
   ```bash
   curl -X PUT http://localhost:8000/api/nodes/$NODE_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name": "Updated Name"}'
   ```

5. **Temporarily Disable**
   ```bash
   curl -X PUT http://localhost:8000/api/nodes/$NODE_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"isEnabled": false}'
   ```

6. **Re-enable**
   ```bash
   curl -X PUT http://localhost:8000/api/nodes/$NODE_ID \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"isEnabled": true}'
   ```

7. **Delete When Done**
   ```bash
   curl -X DELETE http://localhost:8000/api/nodes/$NODE_ID \
     -H "Authorization: Bearer $TOKEN"
   ```
