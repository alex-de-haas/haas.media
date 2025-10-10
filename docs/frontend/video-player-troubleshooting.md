# Video Streaming 403 Forbidden - Troubleshooting Guide

## Current Issue

The video player is getting a 403 Forbidden error when trying to stream videos from the backend API.

## Root Cause

The backend API (`/api/files/stream`) requires JWT authentication with specific Auth0 configuration. The 403 error typically means:

1. **Token validation is failing** - The token is being sent but rejected by the backend
2. **Audience mismatch** - The token's audience doesn't match what the backend expects
3. **Issuer mismatch** - The token's issuer doesn't match the configured Auth0 domain

## Current Configuration

From `.env`:

```
AUTH0_DOMAIN=dev-o1l0rjv003cd8mmq.us.auth0.com
AUTH0_AUDIENCE=https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/
```

## Solutions

### Option 1: Create a Custom API in Auth0 (Recommended)

1. **Go to Auth0 Dashboard** → APIs → Create API

2. **Configure the API:**
   - Name: `Haas.Media API` (or any name)
   - Identifier: `https://api.haas.media` (this becomes your audience)
   - Signing Algorithm: RS256

3. **Update `.env` file:**

   ```properties
   AUTH0_AUDIENCE=https://api.haas.media
   ```

4. **Restart both services** (frontend and backend via Aspire)

### Option 2: Use Auth0 Management API Audience (Current Setup)

If you want to keep using the Management API audience:

1. **Verify Backend Configuration** in `Program.cs`:

   ```csharp
   options.Authority = $"https://{auth0Domain}";  // Should be: https://dev-o1l0rjv003cd8mmq.us.auth0.com
   options.Audience = auth0Audience;              // Should be: https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/
   ```

2. **Check Token Validation** - The issuer should match:
   - Expected: `https://dev-o1l0rjv003cd8mmq.us.auth0.com/`
   - Token must have this in the `iss` claim

### Option 3: Disable Authentication for Development (Temporary)

**⚠️ For development only!**

Modify `Program.cs` in the backend:

```csharp
// Comment out or wrap in environment check
// if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
if (app.Environment.IsProduction()) // Only require auth in production
{
    app.UseAuthentication();
    app.UseAuthorization();
}
```

Then remove `.RequireAuthorization()` from the `/api/files/stream` endpoint or wrap it:

```csharp
var endpoint = app.MapGet(
    "api/files/stream",
    async (string path, HttpContext context, IFilesApi filesApi, IConfiguration configuration) =>
    {
        // ... existing code
    }
)
.WithName("StreamFile");

// Only require authorization in production
if (app.Environment.IsProduction())
{
    endpoint.RequireAuthorization();
}
```

## Debugging Steps

### 1. Check Console Logs

Look for these log messages in your terminal:

**Frontend (Next.js):**

```
[video-stream] Streaming video from: http://localhost:8000/api/files/stream?path=...
[video-stream] Using audience: https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/
[video-stream] Token (first 50 chars): eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6...
```

**Backend (.NET):**
Look for JWT Bearer authentication errors.

### 2. Decode the JWT Token

Copy the token from the console log and decode it at https://jwt.io

Check these claims:

- `iss` (issuer): Should be `https://dev-o1l0rjv003cd8mmq.us.auth0.com/`
- `aud` (audience): Should match `AUTH0_AUDIENCE` in `.env`
- `exp` (expiration): Should be in the future

### 3. Test Backend Directly

```bash
# Get a token from the frontend
# Open browser console on http://localhost:3000 and run:
fetch('/api/token').then(r => r.json()).then(d => console.log(d.accessToken))

# Test the backend API directly
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  "http://localhost:8000/api/files/stream?path=Movies/test.mp4"
```

### 4. Check Backend Authentication Status

Add temporary logging to `Program.cs`:

```csharp
if (!string.IsNullOrWhiteSpace(auth0Domain) && !string.IsNullOrWhiteSpace(auth0Audience))
{
    logger.LogInformation($"🔐 Auth0 Authentication ENABLED");
    logger.LogInformation($"   Domain: {auth0Domain}");
    logger.LogInformation($"   Audience: {auth0Audience}");
    logger.LogInformation($"   Authority: https://{auth0Domain}");

    app.UseAuthentication();
    app.UseAuthorization();
}
else
{
    logger.LogWarning("⚠️  Auth0 Authentication DISABLED - Missing AUTH0_DOMAIN or AUTH0_AUDIENCE");
}
```

## Verification

After applying the fix, you should see:

1. **Frontend logs** showing successful token retrieval
2. **Backend logs** showing successful authentication
3. **Video player** successfully loading and playing videos
4. **Network tab** showing 200 OK or 206 Partial Content responses

## Common Issues

### Issue: "No access token available"

**Cause:** User session doesn't have a valid token
**Fix:** Logout and login again

### Issue: "Token expired"

**Cause:** Token lifetime exceeded
**Fix:** Refresh the page or use the token refresh endpoint

### Issue: "Invalid audience"

**Cause:** Token audience doesn't match backend configuration
**Fix:** Ensure `AUTH0_AUDIENCE` is the same in both frontend and backend

### Issue: "Invalid issuer"

**Cause:** Token issuer doesn't match Auth0 domain
**Fix:** Verify `AUTH0_DOMAIN` is correct and includes the trailing slash check

## Next Steps

Once you've resolved the 403 error, the video player should work correctly with:

- ✅ Authenticated video streaming
- ✅ Range request support for seeking
- ✅ Proper error handling
- ✅ Security through JWT validation
