# External Tokens

External tokens are non-expiring API tokens designed for node-to-node communication and API integrations. Unlike regular JWT tokens that expire after 24 hours, external tokens remain valid until explicitly revoked.

## Features

- **No Expiration**: External tokens never expire automatically
- **Named Tokens**: Each token has a descriptive name for easy management
- **Secure Storage**: Tokens are hashed using SHA256 before storage
- **Per-User**: Tokens are automatically linked to the authenticated user who creates them
- **Usage Tracking**: Last used timestamp is updated on each authentication
- **Easy Revocation**: Tokens can be revoked at any time
- **Endpoint Restrictions**: Can be restricted to specific endpoints for enhanced security (see [External Token Endpoint Restrictions](./external-token-endpoint-restrictions.md))

## Use Cases

### Node-to-Node Communication

When connecting two Haas.Media instances, external tokens are **required** for authentication:

1. Create an external token on the target node
2. Use that token as the `ApiKey` when connecting from the source node
3. The connection will be bidirectional, with each node authenticating to the other

**Note:** By default, external tokens are only accepted on the `/api/nodes/register` endpoint. See [External Token Endpoint Restrictions](./external-token-endpoint-restrictions.md) for configuration details.

### API Integrations

External tokens are ideal for:

- Custom scripts accessing the API
- Third-party applications
- Automation workflows
- CI/CD pipelines

**Security Note:** For enhanced security, external token support can be restricted to specific endpoints. Consult with your system administrator about which endpoints accept external tokens.

## API Endpoints

### Create External Token

**POST** `/api/auth/tokens`

Creates a new external token linked to the authenticated user. The token value is only shown once in the response.

**Authentication Required:** Yes (JWT or existing external token)

**Request:**

```json
{
  "name": "My Node Connection"
}
```

**Response:**

```json
{
  "id": "abc123...",
  "name": "My Node Connection",
  "token": "base64-encoded-token-value",
  "createdAt": "2025-10-27T10:30:00Z"
}
```

**Important:** Save the `token` value immediately - it cannot be retrieved again!

### List External Tokens

**GET** `/api/auth/tokens`

Returns all external tokens for the authenticated user (without token values).

**Authentication Required:** Yes (JWT or existing external token)

**Response:**

```json
[
  {
    "id": "abc123...",
    "name": "My Node Connection",
    "createdAt": "2025-10-27T10:30:00Z",
    "lastUsedAt": "2025-10-27T12:00:00Z"
  }
]
```

### Revoke External Token

**DELETE** `/api/auth/tokens/{tokenId}`

Revokes an external token owned by the authenticated user. The token becomes invalid immediately.

**Authentication Required:** Yes (JWT or existing external token)

**Response:** `204 No Content` on success

## Using External Tokens

External tokens can be used in three ways:

### 1. Bearer Token (Recommended)

```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8000/api/files
```

### 2. X-Api-Key Header

```bash
curl -H "X-Api-Key: YOUR_TOKEN_HERE" \
  http://localhost:8000/api/files
```

### 3. Query Parameter (SignalR only)

```
ws://localhost:8000/hub/torrents?access_token=YOUR_TOKEN_HERE
```

## Node Connection Workflow

### On Target Node

1. Login with your regular credentials
2. Create an external token:
   ```bash
   curl -X POST http://target-node:8000/api/auth/tokens \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{"name": "Connection from Source Node"}'
   ```
3. Save the returned token value

### On Source Node

1. Login with your regular credentials
2. Create an external token for bidirectional authentication
3. Connect to the target node:
   ```bash
   curl -X POST http://source-node:8000/api/nodes \
     -H "Authorization: Bearer YOUR_JWT" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Target Node",
       "url": "http://target-node:8000",
       "apiKey": "TARGET_NODE_TOKEN"
     }'
   ```

## Security Considerations

### Token Storage

- Tokens are hashed using SHA256 before storage
- Original token values are never stored
- Token validation uses constant-time comparison

### Token Generation

- Tokens are generated using cryptographically secure random number generator
- 32 bytes of random data, base64-encoded
- Approximately 256 bits of entropy

### Best Practices

1. **Use Descriptive Names**: Include purpose and target in token names
2. **Rotate Regularly**: Revoke and recreate tokens periodically
3. **Revoke Unused Tokens**: Delete tokens that are no longer needed
4. **Monitor Usage**: Check `lastUsedAt` to identify unused tokens
5. **Secure Transmission**: Always use HTTPS in production

## Migration from NODE_API_KEY

Previous versions used the `NODE_API_KEY` environment variable. This is now deprecated in favor of external tokens:

**Before:**

```env
NODE_API_KEY=some-secret-key
```

**After:**

1. Create an external token via the API
2. Use that token when connecting nodes
3. Remove `NODE_API_KEY` from environment variables

## Implementation Details

### Authentication Flow

1. Extract token from request (Bearer header, X-Api-Key header, or query string)
2. Hash the token using SHA256
3. Look up the token hash in the database
4. If found, update `lastUsedAt` and authenticate as the associated user
5. If not found, attempt JWT validation (for regular login tokens)

### Database Schema

External tokens are stored in the `external_tokens` collection with fields:

- `Id`: Unique identifier
- `Name`: User-provided description
- `TokenHash`: SHA256 hash of the token value
- `UserId`: Owner of the token
- `CreatedAt`: Creation timestamp
- `LastUsedAt`: Last authentication timestamp

Indexes:

- `UserId`: For listing user's tokens
- `TokenHash`: For fast token validation
