# URGENT FIX: Video Streaming 403 Error

## Problem Confirmed

Your debug info shows:
- ✅ Token is present (`hasToken: true`)
- ✅ Request is reaching the backend (`url: http://localhost:8000/api/files/stream`)
- ❌ Backend is rejecting the token (403 Forbidden)
- ⚠️ Using Management API audience: `https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/`

## Root Cause

You're using Auth0's **Management API audience** (`/api/v2/`), which is designed for managing Auth0 itself, not for authenticating users to your custom API. The backend is correctly rejecting these tokens.

## SOLUTION: Create Custom API in Auth0

### Step 1: Create API in Auth0 (5 minutes)

1. **Open Auth0 Dashboard**: https://manage.auth0.com/
2. **Navigate**: Applications → APIs
3. **Click**: "Create API" button
4. **Enter Details**:
   ```
   Name: Haas Media API
   Identifier: https://api.haas.media
   Signing Algorithm: RS256
   ```
5. **Click**: "Create"

### Step 2: Update Environment Variables

Edit `/Users/haas/Sources/Haas.Media/.env`:

```properties
# Change this line:
AUTH0_AUDIENCE=https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/

# To this:
AUTH0_AUDIENCE=https://api.haas.media
```

### Step 3: Restart Services

In your terminal running Aspire:
1. Press `Ctrl+C` to stop
2. Run the build command again:
   ```bash
   dotnet run --project /Users/haas/Sources/Haas.Media/src/Haas.Media.Aspire/Haas.Media.Aspire.csproj
   ```

### Step 4: Clear Browser Session

1. Open your browser
2. Go to http://localhost:3000
3. Logout
4. Login again (this gets a new token with the correct audience)
5. Try playing a video

## Verification

After applying the fix, check the backend logs (in the terminal running Aspire):

You should see:
```
🔐 Auth0 Authentication ENABLED
   Domain: dev-o1l0rjv003cd8mmq.us.auth0.com
   Audience: https://api.haas.media
   Authority: https://dev-o1l0rjv003cd8mmq.us.auth0.com
```

When you try to play a video, you should see:
```
Token validated successfully for /api/files/stream
```

Instead of:
```
Auth challenge for /api/files/stream: invalid_token - ...
```

## Alternative: Temporary Development Workaround

If you need the video player to work immediately while you set up Auth0 properly:

### Option A: Use AllowAnonymous for Development

Edit `FilesConfiguration.cs`, add this after the `.RequireAuthorization()`:

```csharp
.WithName("StreamFile")
.RequireAuthorization()
.AllowAnonymous(); // TEMPORARY - REMOVE IN PRODUCTION
```

**⚠️ WARNING**: This disables authentication completely. Only use for local development!

### Option B: Conditional Authorization

Replace the `.RequireAuthorization()` section in `FilesConfiguration.cs`:

```csharp
var streamEndpoint = app.MapGet(
    "api/files/stream",
    async (string path, HttpContext context, IFilesApi filesApi, IConfiguration configuration) =>
    {
        // ... existing stream code ...
    }
)
.WithName("StreamFile");

// Only require auth in production or when Auth0 is properly configured
if (!app.Environment.IsDevelopment() || 
    (!string.IsNullOrWhiteSpace(app.Configuration["AUTH0_DOMAIN"]) && 
     !string.IsNullOrWhiteSpace(app.Configuration["AUTH0_AUDIENCE"]) &&
     app.Configuration["AUTH0_AUDIENCE"] != "https://dev-o1l0rjv003cd8mmq.us.auth0.com/api/v2/"))
{
    streamEndpoint.RequireAuthorization();
}
```

## Why This Happens

The Auth0 Management API (`/api/v2/`) is a special API that Auth0 provides for managing your Auth0 tenant. Tokens for this API:
- Have specific scopes related to Auth0 management operations
- Are NOT meant for authenticating to your custom applications
- Will be rejected by your backend because they're for a different purpose

Your backend needs tokens issued specifically for your API, which is why you need to create a custom API in Auth0.

## Expected Result

After the fix:
- ✅ Video player opens when clicking "Play"
- ✅ Video loads and plays
- ✅ Seeking (scrubbing) works
- ✅ No 403 errors in console
- ✅ Backend logs show "Token validated successfully"

## Still Not Working?

If you still see 403 after following these steps:

1. **Check Backend Logs**: Look for the authentication error message
   ```
   Authentication failed for /api/files/stream: <error details>
   ```

2. **Check Token Claims**: Copy the token from the console log and decode it at https://jwt.io
   - `aud` should be `https://api.haas.media`
   - `iss` should be `https://dev-o1l0rjv003cd8mmq.us.auth0.com/`
   - `exp` should be in the future

3. **Verify Environment Variables**: Check that both frontend and backend received the updated `AUTH0_AUDIENCE`

4. **Check Port**: Your backend is running on port 5000 instead of 8000. Make sure the frontend's `NEXT_PUBLIC_DOWNLOADER_API` or `NEXT_PUBLIC_API_DOWNLOADER_URL` points to the correct port.
