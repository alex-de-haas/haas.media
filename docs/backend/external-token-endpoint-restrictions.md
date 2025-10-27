# External Token Endpoint Restrictions

This document describes how to configure which endpoints support external token authentication in Haas.Media using ASP.NET Core authorization policies.

## Overview

External tokens are non-expiring API tokens designed for node-to-node communication and API integrations. However, for security reasons, you may want to restrict which endpoints accept external tokens versus requiring regular JWT tokens.

Haas.Media uses authorization policies to provide fine-grained control over which endpoints support external token authentication.

## Authorization Policies

Three authorization policies are available:

### 1. `AuthorizationPolicies.Authenticated`
Requires any authenticated user (JWT or external token). This is the default policy for most endpoints.

### 2. `AuthorizationPolicies.JwtOnly`
Only allows JWT token authentication. External tokens will be rejected even if valid.

### 3. `AuthorizationPolicies.AllowExternalToken`
Explicitly allows external token authentication (and JWT tokens). Use this for endpoints that need to support long-lived external tokens.

## Configuration

Authorization policies are configured in `Program.cs`:

```csharp
// Configure authorization policies
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthorizationPolicies.Authenticated, policy => policy.RequireAuthenticatedUser())
    .AddPolicy(AuthorizationPolicies.JwtOnly, policy => policy.AddRequirements(new JwtOnlyRequirement()))
    .AddPolicy(AuthorizationPolicies.AllowExternalToken, policy => policy.RequireAuthenticatedUser());

// Register authorization handlers
builder.Services.AddSingleton<IAuthorizationHandler, JwtOnlyRequirementHandler>();
```

## Using Policies on Endpoints

Apply policies to endpoints using `.RequireAuthorization()`:

### Allow External Tokens (Explicitly)

```csharp
api.MapPost("/register", async (NodeRegistrationData data, INodesApi nodesApi) =>
{
    // Handler implementation
})
.RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

### Require JWT Only (Block External Tokens)

```csharp
api.MapGet("/sensitive-data", async (ISensitiveApi api) =>
{
    // Handler implementation
})
.RequireAuthorization(AuthorizationPolicies.JwtOnly);
```

### Default Authenticated (Allows Both)

```csharp
api.MapGet("/files", async (IFilesApi api) =>
{
    // Handler implementation
})
.RequireAuthorization(); // Uses default Authenticated policy
```

## Default Configuration

By default:
- **`/api/nodes/register`** uses `AllowExternalToken` policy (explicitly allows external tokens for node-to-node registration)
- **Most other endpoints** use the default `Authenticated` policy (allows both JWT and external tokens)
- **No endpoints** currently use `JwtOnly` (but you can add this for sensitive operations)

## Use Cases

### Node-to-Node Communication

The `/api/nodes/register` endpoint uses `AllowExternalToken` policy because:
- It's called by remote Haas.Media nodes during bidirectional connection setup
- External tokens don't expire, making them ideal for long-lived node connections
- Each node uses its own external token for authentication

```csharp
api.MapPost("/register", async (NodeRegistrationData data, INodesApi nodesApi) =>
{
    // Registration logic
})
.RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

### Sensitive Operations (JWT Only)

For sensitive operations that should only be performed by interactive users:

```csharp
api.MapDelete("/users/{id}", async (string id, IUserApi userApi) =>
{
    // Delete user logic
})
.RequireAuthorization(AuthorizationPolicies.JwtOnly);
```

This ensures that automated systems with external tokens cannot perform sensitive user management operations.

### Public API Endpoints

For endpoints that support both interactive users and API integrations:

```csharp
api.MapGet("/health", async () =>
{
    return Results.Ok(new { status = "healthy" });
})
.RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

## Security Considerations

### Why Use Authorization Policies?

Authorization policies provide several advantages:

1. **Framework Integration**: Native ASP.NET Core feature with built-in support
2. **Declarative Security**: Policies are declared at the endpoint level, making security requirements explicit
3. **Testable**: Authorization handlers can be unit tested independently
4. **Composable**: Policies can be combined with other requirements (roles, claims, etc.)
5. **Centralized**: Policy definitions are in one place (`Program.cs`)

### Why Restrict External Tokens?

While external tokens are convenient for integrations, they should be restricted for certain operations because:

1. **No Expiration**: External tokens never expire, making them more dangerous if leaked
2. **User Context**: External tokens are tied to a specific user account and inherit all their permissions
3. **Revocation Only**: The only way to invalidate an external token is manual revocation
4. **Audit Trail**: JWT tokens provide better session tracking and expiration-based security

### Policy Selection Guidelines

1. **Default to Authenticated**: Most endpoints should use the default `Authenticated` policy unless there's a specific reason to restrict
2. **Use JwtOnly Sparingly**: Only use `JwtOnly` for truly sensitive operations that require interactive user sessions
3. **Document Exceptions**: When using `AllowExternalToken` explicitly, document why external tokens are needed
4. **Regular Audits**: Periodically review endpoint policies and external token usage
5. **Principle of Least Privilege**: Create separate external tokens with minimal necessary permissions

## Example: Configuring a New Endpoint

### Allow External Tokens for Monitoring

```csharp
// In your feature configuration (e.g., MonitoringConfiguration.cs)
api.MapGet("/health", async () =>
{
    return Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
})
.WithName("HealthCheck")
.RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

This allows external monitoring tools to use external tokens to check health without requiring user login credentials.

### Restrict User Management to JWT Only

```csharp
// In AuthenticationConfiguration.cs
api.MapDelete("/users/{id}", async (string id, IAuthenticationApi authApi) =>
{
    // Delete user logic
})
.WithName("DeleteUser")
.RequireAuthorization(AuthorizationPolicies.JwtOnly);
```

This ensures only interactive users (not automated systems) can delete user accounts.

## How It Works

### Authentication Flow

1. **Token Extraction**: The `HybridAuthenticationHandler` extracts the token from the request (Bearer header, X-Api-Key header, or query string)

2. **External Token Validation**: First attempts to validate as an external token
   - If valid, creates a claims principal with `auth_type = "external_token"`
   - User is now authenticated

3. **JWT Token Validation**: If not an external token, attempts JWT validation
   - If valid, creates a claims principal with standard JWT claims
   - User is now authenticated

4. **Authorization Policy Check**: ASP.NET Core authorization checks the policy
   - `Authenticated`: Allows any authenticated user (both JWT and external tokens)
   - `AllowExternalToken`: Allows any authenticated user (both JWT and external tokens)
   - `JwtOnly`: Checks the `auth_type` claim and rejects if it's `"external_token"`

### The JwtOnlyRequirement

The `JwtOnlyRequirement` authorization handler checks if the user authenticated with an external token:

```csharp
protected override Task HandleRequirementAsync(
    AuthorizationHandlerContext context,
    JwtOnlyRequirement requirement
)
{
    if (!context.User.Identity?.IsAuthenticated ?? true)
    {
        return Task.CompletedTask;
    }

    // Check if user authenticated with external token
    var authType = context.User.FindFirst("auth_type")?.Value;
    if (authType == "external_token")
    {
        context.Fail(); // Reject external tokens
        return Task.CompletedTask;
    }

    context.Succeed(requirement); // Allow JWT tokens
    return Task.CompletedTask;
}
```

## Logging

The authentication handler logs its decisions:

```
[Debug] External token validated for user: admin
[Debug] JWT token validated
```

Authorization failures will also be logged by ASP.NET Core when a policy requirement fails.

## Adding New Endpoint Policies

To restrict an endpoint to JWT-only authentication:

1. **Apply the Policy** in your endpoint configuration:
   ```csharp
   api.MapDelete("/users/{id}", async (string id, IUserApi userApi) =>
   {
       // Implementation
   })
   .RequireAuthorization(AuthorizationPolicies.JwtOnly);
   ```

2. **Document the Decision**: Update relevant documentation explaining why this endpoint requires JWT-only

3. **Test Both Methods**: Verify the endpoint rejects external tokens and accepts JWT tokens

## Best Practices

### When to Use `JwtOnly`

Use `JwtOnly` policy for:
- User management endpoints (create, delete, update users)
- Sensitive configuration changes
- Operations that should only be performed by interactive users
- Actions that require user consent or MFA

### When to Use `AllowExternalToken`

Use `AllowExternalToken` policy for:
- Node-to-node communication endpoints
- API integrations with trusted external systems
- Monitoring and health check endpoints
- Long-running automated processes

### When to Use Default `Authenticated`

Use default `Authenticated` (or `AllowExternalToken`) for:
- Most API endpoints
- Data retrieval operations
- File operations
- Metadata operations

## Migration from Previous Implementation

If you're migrating from the `ExternalTokenEndpointOptions` approach:

### Old Approach (ExternalTokenEndpointOptions)

```csharp
// In Program.cs
builder.Services.Configure<ExternalTokenEndpointOptions>(options =>
{
    options.AllowEndpoint("/api/nodes/register");
    options.AllowEndpoint("/api/public/*");
});

// Endpoint automatically checked by authentication handler
api.MapPost("/register", handler)
    .RequireAuthorization();
```

### New Approach (Authorization Policies)

```csharp
// In Program.cs
builder.Services.AddAuthorizationBuilder()
    .AddPolicy(AuthorizationPolicies.AllowExternalToken, policy => 
        policy.RequireAuthenticatedUser());

// Explicitly declare policy on endpoint
api.MapPost("/register", handler)
    .RequireAuthorization(AuthorizationPolicies.AllowExternalToken);
```

### Benefits of the New Approach

1. **Explicit Security**: Each endpoint declares its authentication requirements
2. **Standard ASP.NET Core**: Uses built-in authorization framework
3. **Better Tooling**: Works with ASP.NET Core authorization middleware and testing
4. **More Flexible**: Can combine with other authorization requirements (roles, claims)

## Summary

- Use `AuthorizationPolicies.Authenticated` (default) for most endpoints
- Use `AuthorizationPolicies.AllowExternalToken` for node-to-node communication and API integrations
- Use `AuthorizationPolicies.JwtOnly` for sensitive operations requiring interactive users
- Declare policies explicitly on each endpoint for clear security requirements
- The `HybridAuthenticationHandler` handles both JWT and external token validation
- Authorization policies control which token types are accepted per endpoint
