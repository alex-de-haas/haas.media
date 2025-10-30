# External Tokens Quick Start

This guide shows you how to create and use external tokens for API access and node connections.

## Creating Your First External Token

### 1. Login and Get a JWT

```bash
# Login to get a JWT token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your-username",
    "password": "your-password"
  }'

# Response:
{
  "token": "eyJhbGc...",
  "username": "your-username"
}
```

Save the JWT token from the response.

### 2. Create an External Token

```bash
# Create an external token (using the JWT from step 1)
curl -X POST http://localhost:8000/api/auth/tokens \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Token"
  }'

# Response:
{
  "id": "abc123...",
  "name": "My API Token",
  "token": "qP8x7v...",  # <-- SAVE THIS!
  "createdAt": "2025-10-27T10:30:00Z"
}
```

**⚠️ Important:** The `token` value is only shown once. Save it securely!

### 3. Use Your External Token

```bash
# Use the external token to access the API
curl http://localhost:8000/api/files \
  -H "Authorization: Bearer YOUR_EXTERNAL_TOKEN_HERE"
```

## Managing Tokens

### List All Your Tokens

```bash
curl http://localhost:8000/api/auth/tokens \
  -H "Authorization: Bearer YOUR_JWT_HERE"

# Response:
[
  {
    "id": "abc123...",
    "name": "My API Token",
    "createdAt": "2025-10-27T10:30:00Z",
    "lastUsedAt": "2025-10-27T12:00:00Z"
  }
]
```

### Revoke a Token

```bash
curl -X DELETE http://localhost:8000/api/auth/tokens/abc123... \
  -H "Authorization: Bearer YOUR_JWT_HERE"

# Response: 204 No Content
```

## Connecting Nodes

External tokens are **required** for node-to-node connections.

### On Target Node (Node B)

```bash
# 1. Login to target node
curl -X POST http://node-b:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# 2. Create external token
curl -X POST http://node-b:8000/api/auth/tokens \
  -H "Authorization: Bearer NODE_B_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "Connection from Node A"}'

# Save the returned token
```

### On Source Node (Node A)

```bash
# 1. Login to source node
curl -X POST http://node-a:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'

# 2. Create external token for bidirectional auth
curl -X POST http://node-a:8000/api/auth/tokens \
  -H "Authorization: Bearer NODE_A_JWT" \
  -H "Content-Type: application/json" \
  -d '{"name": "My local token for Node B"}'

# 3. Connect to target node
curl -X POST http://node-a:8000/api/nodes \
  -H "Authorization: Bearer NODE_A_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Node B",
    "url": "http://node-b:8000",
    "apiKey": "NODE_B_EXTERNAL_TOKEN"
  }'
```

## Using Tokens in Code

### JavaScript/TypeScript

```typescript
const EXTERNAL_TOKEN = "your-external-token-here";

async function fetchFiles() {
  const response = await fetch("http://localhost:8000/api/files", {
    headers: {
      Authorization: `Bearer ${EXTERNAL_TOKEN}`,
    },
  });
  return response.json();
}
```

### Python

```python
import requests

EXTERNAL_TOKEN = 'your-external-token-here'

def fetch_files():
    headers = {'Authorization': f'Bearer {EXTERNAL_TOKEN}'}
    response = requests.get('http://localhost:8000/api/files', headers=headers)
    return response.json()
```

### cURL

```bash
# Method 1: Bearer token (recommended)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8000/api/files

# Method 2: X-Api-Key header
curl -H "X-Api-Key: YOUR_TOKEN" \
  http://localhost:8000/api/files
```

## Common Issues

### "API Key is required" Error

When connecting nodes, you must provide an external token from the target node:

```json
{
  "error": "API Key is required. Use an external token from /api/auth/tokens endpoint."
}
```

**Solution:** Create an external token on the target node first, then use it as the `apiKey`.

### "Invalid token" Error

- External token may have been revoked
- Token may have been copied incorrectly (check for trailing spaces)
- Using a JWT instead of an external token

**Solution:** Create a new external token and update your configuration.

### Token Not Working After Creation

Make sure you're using the `token` value from the creation response, not the `id`:

```json
{
  "id": "abc123", // ❌ NOT this
  "token": "qP8x7v...", // ✅ Use this
  "name": "My Token"
}
```

## Next Steps

- Read the full [External Tokens documentation](./external-tokens.md)
- Learn about [Node Connection](../operations/node-connection.md)
- Explore [API Authentication](./local-auth-complete-guide.md)
