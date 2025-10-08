# AppHost.cs Configuration Fix

## Issue

The application was throwing a `KeyNotFoundException` when starting via .NET Aspire:

```
Exception thrown: 'System.Collections.Generic.KeyNotFoundException' in System.Private.CoreLib.dll: 
'The given key 'AUTH0_DOMAIN' was not present in the dictionary.'
```

## Root Cause

In `src/Haas.Media.Aspire/AppHost.cs`, the code was directly accessing the environment dictionary without checking if keys existed:

```csharp
// ❌ BEFORE - Throws exception if key doesn't exist
var auth0Domain = builder.AddParameter("auth0-domain", value: env["AUTH0_DOMAIN"]);
```

Since Auth0 configuration is now optional (with local authentication as an alternative), these keys may not be present in the environment.

## Solution

Added a helper function to safely retrieve environment variables with a default empty string:

```csharp
// ✅ AFTER - Returns empty string if key doesn't exist
string GetEnvOrEmpty(string key) => env.TryGetValue(key, out var value) ? value : string.Empty;

var auth0Domain = builder.AddParameter("auth0-domain", value: GetEnvOrEmpty("AUTH0_DOMAIN"));
```

## Changes Made

### Updated Environment Variable Access

All environment variable accesses in `AppHost.cs` now use the `GetEnvOrEmpty()` helper:

- `AUTH0_DOMAIN`
- `AUTH0_AUDIENCE`
- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `JWT_SECRET`
- `JWT_ISSUER`
- `JWT_AUDIENCE`
- `JWT_EXPIRATION_MINUTES`
- `TMDB_API_KEY`
- `DATA_DIRECTORY`
- `FFMPEG_BINARY`

### Added Local Auth Parameters

Added JWT configuration parameters to be passed to the API:

```csharp
.WithEnvironment("JWT_SECRET", jwtSecret)
.WithEnvironment("JWT_ISSUER", jwtIssuer)
.WithEnvironment("JWT_AUDIENCE", jwtAudience)
.WithEnvironment("JWT_EXPIRATION_MINUTES", jwtExpirationMinutes)
```

### Added Frontend Auth Mode Detection

Added `NEXT_PUBLIC_AUTH0_DOMAIN` to allow the frontend to detect authentication mode:

```csharp
.WithEnvironment("NEXT_PUBLIC_AUTH0_DOMAIN", auth0Domain)
```

## Result

The application now:
- ✅ Starts successfully even when Auth0 variables are missing
- ✅ Starts successfully even when JWT variables are missing
- ✅ Works with Auth0 authentication when configured
- ✅ Works with local authentication when configured
- ✅ Gracefully handles missing environment variables

## Testing

To verify the fix:

1. **With local auth**:
   ```bash
   # Ensure .env has JWT_SECRET but no Auth0 vars
   dotnet run --project src/Haas.Media.Aspire
   ```
   Expected: "🔐 Local JWT Authentication ENABLED"

2. **With Auth0**:
   ```bash
   # Ensure .env has AUTH0_DOMAIN and AUTH0_AUDIENCE
   dotnet run --project src/Haas.Media.Aspire
   ```
   Expected: "🔐 Auth0 Authentication ENABLED"

3. **With neither**:
   ```bash
   # Remove both JWT_SECRET and Auth0 vars
   dotnet run --project src/Haas.Media.Aspire
   ```
   Expected: "⚠️  Authentication DISABLED"

## Related Files

- `src/Haas.Media.Aspire/AppHost.cs` - Main fix location
- `src/Haas.Media.Downloader.Api/Program.cs` - Authentication mode detection
- `.env` - Environment configuration
- `.env.example` - Example configuration

## Prevention

To prevent similar issues in the future:
1. Always use `TryGetValue()` or similar safe accessors for dictionary/configuration access
2. Consider all environment variables as optional unless explicitly required
3. Provide sensible defaults for optional configuration
4. Document required vs optional environment variables
