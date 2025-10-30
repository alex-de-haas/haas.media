# Authorization Policies Quick Reference

Quick guide for choosing the right authorization policy for your endpoints.

## Available Policies

```csharp
using Haas.Media.Services.Authentication;

// In your endpoint configuration:
.RequireAuthorization(AuthorizationPolicies.Authenticated)       // Default - allows both JWT and external tokens
.RequireAuthorization(AuthorizationPolicies.AllowExternalToken) // Explicitly allows external tokens
.RequireAuthorization(AuthorizationPolicies.JwtOnly)            // Only JWT tokens, blocks external tokens
```

## Decision Tree

```
Does your endpoint need authentication?
├─ No  → Use .AllowAnonymous()
└─ Yes → Continue below

Should external tokens (non-expiring API tokens) be allowed?
├─ Yes, external tokens are needed
│  └─ Use .RequireAuthorization(AuthorizationPolicies.AllowExternalToken)
│     Examples: /api/nodes/register, /api/health, API integration endpoints
│
├─ No, only interactive users
│  └─ Use .RequireAuthorization(AuthorizationPolicies.JwtOnly)
│     Examples: /api/users/delete, /api/config/reset, sensitive operations
│
└─ Either is fine (default)
   └─ Use .RequireAuthorization() or .RequireAuthorization(AuthorizationPolicies.Authenticated)
      Examples: Most CRUD operations, file access, metadata operations
```

## Common Scenarios

### Node-to-Node Communication

```csharp
api.MapPost("/register", handler)
    .RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

**Why:** Remote nodes use external tokens for persistent connections.

### User Management

```csharp
api.MapDelete("/users/{id}", handler)
    .RequireAuthorization(AuthorizationPolicies.JwtOnly);
```

**Why:** Only interactive users should manage user accounts, not automated systems.

### File Operations

```csharp
api.MapGet("/files", handler)
    .RequireAuthorization(); // Uses default Authenticated policy
```

**Why:** Both users and API integrations may need file access.

### Public Health Check

```csharp
api.MapGet("/health", handler)
    .RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

**Why:** Monitoring systems need persistent access via external tokens.

### Sensitive Configuration

```csharp
api.MapPost("/config/reset", handler)
    .RequireAuthorization(AuthorizationPolicies.JwtOnly);
```

**Why:** Configuration resets should require interactive user confirmation.

## Policy Comparison

| Policy               | JWT Tokens | External Tokens | Use Case                            |
| -------------------- | ---------- | --------------- | ----------------------------------- |
| `Authenticated`      | ✅ Allowed | ✅ Allowed      | Default for most endpoints          |
| `AllowExternalToken` | ✅ Allowed | ✅ Allowed      | Same as Authenticated, but explicit |
| `JwtOnly`            | ✅ Allowed | ❌ Blocked      | Sensitive operations only           |

## Implementation Details

### Authentication Handler

The `HybridAuthenticationHandler` validates both token types:

1. Attempts external token validation first
2. Falls back to JWT validation if external token invalid
3. Sets `auth_type` claim to `"external_token"` or standard JWT claims

### Authorization Check

The `JwtOnlyRequirement` handler:

1. Checks if user is authenticated
2. Checks the `auth_type` claim
3. Fails if `auth_type == "external_token"`
4. Succeeds for JWT tokens

## Best Practices

✅ **DO:**

- Use `Authenticated` (default) unless you have a specific reason to restrict
- Use `JwtOnly` for operations that modify user accounts or sensitive settings
- Use `AllowExternalToken` for API integration and node-to-node endpoints
- Document why you chose a specific policy

❌ **DON'T:**

- Use `JwtOnly` everywhere (it blocks legitimate automation)
- Use `AllowExternalToken` for sensitive operations
- Forget to document security decisions
- Mix security approaches (stick to policies)

## Testing

### Test External Token Rejection

```bash
# Should fail with 403 Forbidden on JwtOnly endpoints
curl -H "Authorization: Bearer <external-token>" \
     http://localhost:8000/api/users/123 \
     -X DELETE
```

### Test External Token Acceptance

```bash
# Should succeed on AllowExternalToken endpoints
curl -H "Authorization: Bearer <external-token>" \
     http://localhost:8000/api/nodes/register \
     -X POST -d '{"name":"test","url":"http://test"}'
```

### Test JWT Acceptance

```bash
# Should succeed on all authenticated endpoints
curl -H "Authorization: Bearer <jwt-token>" \
     http://localhost:8000/api/files
```

## See Also

- [External Token Endpoint Restrictions](./external-token-endpoint-restrictions.md) - Detailed documentation
- [External Tokens](./external-tokens.md) - External token overview and usage
- [Local Authentication](./local-authentication.md) - JWT authentication setup
