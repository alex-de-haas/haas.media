# Authentication Documentation - Complete Guide

**Last Updated:** October 5, 2025  
**Version:** 1.0  
**Author:** Haas.Media Development Team

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Core Implementation](#core-implementation)
4. [Usage Guide](#usage-guide)
5. [Migration Guide](#migration-guide)
6. [Common Patterns](#common-patterns)
7. [Testing](#testing)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)
10. [API Reference](#api-reference)

---

## Overview

### What This Does

The Haas.Media application uses Auth0 for authentication and implements automatic relogin functionality when API requests receive a 401 (Unauthorized) status code. When a user's session expires or their token becomes invalid, they are automatically redirected to the Auth0 login page and then returned to their original location after successful authentication.

### Key Features

- ✅ **Automatic Token Management** - No manual `getValidToken()` calls needed
- ✅ **Transparent 401 Handling** - Automatic redirect to login on authentication failure
- ✅ **Session Preservation** - Users return to their original page after login
- ✅ **Token Cache Invalidation** - Stale tokens are cleared automatically
- ✅ **Type Safety** - Full TypeScript support with proper error handling
- ✅ **Centralized Logic** - All authentication logic in one place
- ✅ **Backward Compatible** - Existing code continues to work

### Architecture

```
┌─────────────────┐
│  User Action    │
│  (API Request)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  fetchWithAuth  │
│  - Get Token    │
│  - Add Header   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   HTTP Request  │
└────────┬────────┘
         │
    ┌────┴────┐
    │ Status? │
    └────┬────┘
         │
    ┌────┼────────┐
    │             │
   401           2xx
    │             │
    ▼             ▼
┌─────────┐   ┌──────────┐
│ Clear   │   │ Return   │
│ Cache   │   │ Response │
└────┬────┘   └──────────┘
     │
     ▼
┌──────────────────────────┐
│ Redirect to Login        │
│ /api/auth/login          │
│ ?returnTo=/current/path  │
└────────┬─────────────────┘
         │
         ▼
┌─────────────────┐
│ Auth0 Login     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Return to Page  │
└─────────────────┘
```

---

## Quick Start

### 1. Import the Functions

```typescript
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
```

### 2. Replace fetch() Calls

**Before:**

```typescript
const token = await getValidToken();
const headers: HeadersInit = {};
if (token) (headers as any).Authorization = `Bearer ${token}`;
const res = await fetch(url, { headers });
```

**After:**

```typescript
const res = await fetchWithAuth(url);
```

### 3. Use JSON Helper for Simple Requests

```typescript
// For GET requests returning JSON
const data = await fetchJsonWithAuth<DataType>("/api/endpoint");
```

---

## Core Implementation

### Location

`/src/Haas.Media.Web/lib/auth/fetch-with-auth.ts`

### Main Functions

#### `fetchWithAuth(input, init?)`

A drop-in replacement for the native `fetch` API.

**Signature:**

```typescript
async function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
```

**What it does:**

1. Retrieves the current access token using `getValidToken()`
2. Adds the token to the `Authorization` header as a Bearer token
3. Makes the HTTP request
4. If response is 401:
   - Clears the token cache via `clearCachedToken()`
   - Redirects to `/api/auth/login?returnTo=<current-path>`
5. Returns the response for all other status codes

**Example:**

```typescript
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";

// Simple GET
const response = await fetchWithAuth("/api/files");

// POST with JSON
const response = await fetchWithAuth("/api/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "test.txt" }),
});

// DELETE
const response = await fetchWithAuth(`/api/files/${id}`, {
  method: "DELETE",
});
```

#### `fetchJsonWithAuth<T>(input, init?)`

A convenience wrapper that automatically parses JSON responses.

**Signature:**

```typescript
async function fetchJsonWithAuth<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T>;
```

**What it does:**

1. Calls `fetchWithAuth()` with the same parameters
2. Checks if response is OK (status 200-299)
3. If not OK, throws an error with the response message
4. Parses and returns the JSON response with type safety

**Example:**

```typescript
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";

interface User {
  id: string;
  username: string;
  preferredMetadataLanguage: string;
}

// Type-safe GET request
const user = await fetchJsonWithAuth<User>("/api/user");

// POST with automatic parsing
const newUser = await fetchJsonWithAuth<User>("/api/users", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "john", preferredMetadataLanguage: "en" }),
});
```

---

## Usage Guide

### When to Use Each Function

| Scenario                    | Use                      | Reason               |
| --------------------------- | ------------------------ | -------------------- |
| GET request returning JSON  | `fetchJsonWithAuth<T>()` | Cleanest, type-safe  |
| POST/PUT with JSON response | `fetchJsonWithAuth<T>()` | Automatic parsing    |
| FormData upload             | `fetchWithAuth()`        | Non-JSON body        |
| Need response headers       | `fetchWithAuth()`        | Full Response object |
| Custom error handling       | `fetchWithAuth()`        | More control         |
| DELETE with no response     | `fetchWithAuth()`        | No parsing needed    |

### Basic Patterns

#### Pattern 1: Simple GET Request

```typescript
// Returns JSON array of files
const files = await fetchJsonWithAuth<FileItem[]>(`${downloaderApi}/api/files`);
```

#### Pattern 2: GET with Query Parameters

```typescript
const url = new URL(`${downloaderApi}/api/files`);
url.searchParams.set("path", "/downloads");
url.searchParams.set("filter", "video");

const files = await fetchJsonWithAuth<FileItem[]>(url.toString());
```

#### Pattern 3: POST with JSON Body

```typescript
const request = {
  name: "Movie.mp4",
  quality: "1080p",
};

await fetchWithAuth(`${downloaderApi}/api/encodings`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(request),
});
```

#### Pattern 4: FormData Upload

```typescript
const formData = new FormData();
formData.append("file", file);
formData.append("overwrite", "true");

const response = await fetchWithAuth(`${downloaderApi}/api/files/upload`, {
  method: "POST",
  body: formData,
  // Note: Don't set Content-Type header - browser will set it with boundary
});
```

#### Pattern 5: DELETE Request

```typescript
await fetchWithAuth(`${downloaderApi}/api/files/${fileId}`, {
  method: "DELETE",
});
```

#### Pattern 6: Custom Error Handling

```typescript
const response = await fetchWithAuth(`${downloaderApi}/api/files`);

if (!response.ok) {
  const error = await response.json().catch(() => null);
  throw new Error(error?.message || response.statusText);
}

const data = await response.json();
```

### In React Hooks

#### Complete Hook Example

```typescript
"use client";

import { useState, useCallback } from "react";
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";
import type { FileItem } from "@/types/file";

export function useFiles() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFiles = useCallback(async (path?: string): Promise<FileItem[]> => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${downloaderApi}/api/files`);
      if (path) url.searchParams.set("path", path);

      return await fetchJsonWithAuth<FileItem[]>(url.toString());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteFile = useCallback(async (path: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL(`${downloaderApi}/api/files`);
      url.searchParams.set("path", path);

      const response = await fetchWithAuth(url.toString(), {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete file: ${response.statusText}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getFiles, deleteFile, loading, error };
}
```

---

## Migration Guide

### Step-by-Step Migration

#### Step 1: Add Import

```typescript
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";
// or
import { fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
```

#### Step 2: Remove Token Management

**Remove these lines:**

```typescript
const token = await getValidToken();
const headers: HeadersInit = {};
if (token) (headers as any).Authorization = `Bearer ${token}`;
```

#### Step 3: Replace fetch() Call

**Before:**

```typescript
const res = await fetch(`${downloaderApi}/api/files`, { headers });
```

**After:**

```typescript
const res = await fetchWithAuth(`${downloaderApi}/api/files`);
```

#### Step 4: Update Error Handling

**Before:**

```typescript
} catch (err: any) {
  setError(err?.message ?? String(err));
  throw err;
}
```

**After:**

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  setError(message);
  throw err;
}
```

#### Step 5: Simplify JSON Parsing (Optional)

**Before:**

```typescript
const res = await fetchWithAuth(url);
if (!res.ok) {
  const body = await res.json().catch(() => null);
  throw new Error(body?.error ?? res.statusText);
}
return await res.json();
```

**After:**

```typescript
return await fetchJsonWithAuth<ReturnType>(url);
```

### Complete Before/After Example

#### Before Migration

```typescript
"use client";

import { useState, useCallback } from "react";
import { getValidToken } from "@/lib/auth/token";
import { downloaderApi } from "@/lib/api";

export function useTorrents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTorrents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const headers: HeadersInit = {};
      if (token) (headers as any).Authorization = `Bearer ${token}`;

      const res = await fetch(`${downloaderApi}/api/torrents`, { headers });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? res.statusText);
      }

      return await res.json();
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTorrent = useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    try {
      const token = await getValidToken();
      const headers: HeadersInit = {};
      if (token) (headers as any).Authorization = `Bearer ${token}`;

      const res = await fetch(`${downloaderApi}/api/torrents/${hash}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }
    } catch (err: any) {
      setError(err?.message ?? String(err));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getTorrents, deleteTorrent, loading, error };
}
```

#### After Migration

```typescript
"use client";

import { useState, useCallback } from "react";
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
import { downloaderApi } from "@/lib/api";

export function useTorrents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTorrents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      return await fetchJsonWithAuth(`${downloaderApi}/api/torrents`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTorrent = useCallback(async (hash: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${downloaderApi}/api/torrents/${hash}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(res.statusText);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getTorrents, deleteTorrent, loading, error };
}
```

### Migration Checklist

Use this checklist when migrating a file:

- [ ] Import `fetchWithAuth` and/or `fetchJsonWithAuth`
- [ ] Remove `getValidToken` import (if no longer needed)
- [ ] Find all `await getValidToken()` calls
- [ ] Remove manual Authorization header construction
- [ ] Replace `fetch()` with `fetchWithAuth()`
- [ ] Consider using `fetchJsonWithAuth()` for simple JSON responses
- [ ] Update error handling from `err: any` to `err: unknown`
- [ ] Fix error message extraction to use proper type checking
- [ ] Remove any `as any` type assertions
- [ ] Test the functionality thoroughly
- [ ] Verify 401 handling redirects correctly

---

## Common Patterns

### Pattern Library

#### 1. Simple GET with JSON Response

```typescript
const users = await fetchJsonWithAuth<User[]>("/api/users");
```

#### 2. GET with URL Parameters

```typescript
const url = new URL(`${baseUrl}/api/search`);
url.searchParams.set("query", "movie");
url.searchParams.set("limit", "10");

const results = await fetchJsonWithAuth<SearchResult[]>(url.toString());
```

#### 3. POST with JSON Body and Response

```typescript
interface CreateRequest {
  name: string;
  type: string;
}

interface CreateResponse {
  id: string;
  created: string;
}

const response = await fetchJsonWithAuth<CreateResponse>("/api/items", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test", type: "document" }),
});
```

#### 4. PUT/PATCH Update

```typescript
const updated = await fetchJsonWithAuth<Item>(`/api/items/${id}`, {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Updated Name" }),
});
```

#### 5. DELETE with Confirmation

```typescript
const response = await fetchWithAuth(`/api/items/${id}`, {
  method: "DELETE",
});

if (response.ok) {
  console.log("Item deleted successfully");
}
```

#### 6. File Upload with Progress

```typescript
const formData = new FormData();
files.forEach((file) => formData.append("files", file));

const response = await fetchWithAuth("/api/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
```

#### 7. Conditional Request with Headers

```typescript
const response = await fetchWithAuth("/api/data", {
  headers: {
    "If-None-Match": etag,
    "Cache-Control": "no-cache",
  },
});

if (response.status === 304) {
  // Use cached data
} else {
  const data = await response.json();
}
```

#### 8. Streaming Response

```typescript
const response = await fetchWithAuth("/api/stream");

if (!response.ok) {
  throw new Error("Stream failed");
}

const reader = response.body?.getReader();
// Process stream...
```

---

## Testing

### Manual Testing Steps

1. **Test Successful Requests**

   ```typescript
   // Make a normal API call
   const data = await fetchJsonWithAuth("/api/files");
   // Verify: Data is returned correctly
   ```

2. **Test 401 Handling**
   - Open DevTools Network tab
   - Make an API call
   - In another tab, clear cookies or wait for session expiry
   - Make another API call
   - Verify: Automatic redirect to login page
   - Complete login
   - Verify: Redirect back to original page

3. **Test Return URL Preservation**
   - Navigate to `/app/files/downloads`
   - Trigger session expiry
   - Make an API call
   - Verify: After login, returned to `/app/files/downloads`

4. **Test Token Refresh**
   - Make multiple API calls in succession
   - Verify: Token is reused from cache
   - Verify: No excessive token refresh calls

### Automated Testing Example

```typescript
// Example test (using Jest/Vitest)
import { fetchWithAuth } from "@/lib/auth/fetch-with-auth";

describe("fetchWithAuth", () => {
  it("should add Authorization header", async () => {
    const mockFetch = jest.fn(() => Promise.resolve(new Response(JSON.stringify({}), { status: 200 })));
    global.fetch = mockFetch;

    await fetchWithAuth("/api/test");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /),
        }),
      }),
    );
  });

  it("should redirect on 401", async () => {
    const mockFetch = jest.fn(() => Promise.resolve(new Response(null, { status: 401 })));
    global.fetch = mockFetch;

    delete window.location;
    window.location = { href: "" } as any;

    await fetchWithAuth("/api/test");

    expect(window.location.href).toContain("/api/auth/login");
    expect(window.location.href).toContain("returnTo=");
  });
});
```

---

## Best Practices

### 1. Always Use fetchWithAuth for Authenticated Requests

❌ **Don't:**

```typescript
const token = await getValidToken();
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
```

✅ **Do:**

```typescript
const res = await fetchWithAuth(url);
```

### 2. Use fetchJsonWithAuth for Simple JSON Requests

❌ **Don't:**

```typescript
const res = await fetchWithAuth(url);
const data = await res.json();
```

✅ **Do:**

```typescript
const data = await fetchJsonWithAuth<DataType>(url);
```

### 3. Proper Error Typing

❌ **Don't:**

```typescript
catch (err: any) {
  console.error(err?.message);
}
```

✅ **Do:**

```typescript
catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.error(message);
}
```

### 4. Type Your Responses

❌ **Don't:**

```typescript
const data = await fetchJsonWithAuth(url);
```

✅ **Do:**

```typescript
const data = await fetchJsonWithAuth<FileItem[]>(url);
```

### 5. Handle Errors Appropriately

✅ **Do:**

```typescript
try {
  const data = await fetchJsonWithAuth<Data>(url);
  // Use data
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  setError(message);
  // Show user-friendly error message
}
```

### 6. Don't Set Content-Type for FormData

❌ **Don't:**

```typescript
await fetchWithAuth(url, {
  method: "POST",
  headers: { "Content-Type": "multipart/form-data" },
  body: formData,
});
```

✅ **Do:**

```typescript
await fetchWithAuth(url, {
  method: "POST",
  body: formData, // Browser sets correct Content-Type with boundary
});
```

### 7. Use URL Objects for Query Parameters

❌ **Don't:**

```typescript
const url = `${baseUrl}/api/search?query=${query}&limit=${limit}`;
```

✅ **Do:**

```typescript
const url = new URL(`${baseUrl}/api/search`);
url.searchParams.set("query", query);
url.searchParams.set("limit", limit.toString());
```

---

## Troubleshooting

### Issue: Redirect Loop

**Symptom:** Browser keeps redirecting between login and app

**Causes:**

- Login endpoint returns 401
- Auth0 configuration issues
- Cookie problems

**Solutions:**

1. Check Auth0 configuration in `.env`
2. Verify `AUTH0_AUDIENCE` is correct
3. Clear browser cookies and try again
4. Check backend logs for authentication errors

### Issue: Token Not Included in Request

**Symptom:** 401 errors even after login

**Causes:**

- Using `fetch()` instead of `fetchWithAuth()`
- Token cache not populated

**Solutions:**

1. Verify using `fetchWithAuth()` or `fetchJsonWithAuth()`
2. Check browser console for token fetch errors
3. Verify `/api/token` endpoint is working

### Issue: Return URL Not Working

**Symptom:** After login, user goes to home page instead of original page

**Causes:**

- Return URL encoding issues
- Middleware configuration

**Solutions:**

1. Check that `returnTo` parameter is properly encoded
2. Verify middleware config allows the return path
3. Check Auth0 allowed callback URLs

### Issue: TypeScript Errors

**Symptom:** Type errors when using `fetchJsonWithAuth`

**Solutions:**

1. Provide explicit type parameter: `fetchJsonWithAuth<YourType>(url)`
2. Ensure types are properly defined
3. Use `unknown` instead of `any` in catch blocks

### Issue: CORS Errors

**Symptom:** CORS errors in browser console

**Solutions:**

1. Verify backend CORS configuration
2. Check `ALLOWED_CORS_ORIGINS` in backend `.env`
3. Ensure `credentials: 'include'` if using cookies

---

## API Reference

### fetchWithAuth()

```typescript
function fetchWithAuth(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
```

**Parameters:**

- `input`: URL or Request object
- `init`: Optional fetch options (headers, method, body, etc.)

**Returns:** `Promise<Response>` - Standard fetch Response object

**Behavior:**

- Adds Authorization header automatically
- Intercepts 401 responses
- Redirects to login on 401
- Returns Response for all other status codes

**Example:**

```typescript
const response = await fetchWithAuth("/api/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
```

### fetchJsonWithAuth()

```typescript
function fetchJsonWithAuth<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T>;
```

**Parameters:**

- `T`: Type parameter for response data
- `input`: URL or Request object
- `init`: Optional fetch options

**Returns:** `Promise<T>` - Parsed JSON data with specified type

**Throws:** Error if response is not OK (status not 200-299)

**Behavior:**

- Calls `fetchWithAuth()` internally
- Checks response status
- Parses JSON automatically
- Provides type safety

**Example:**

```typescript
interface User {
  id: string;
  name: string;
}

const user = await fetchJsonWithAuth<User>("/api/user");
// user is typed as User
```

### getValidToken()

```typescript
function getValidToken(forceRefresh?: boolean): Promise<string | null>;
```

**Parameters:**

- `forceRefresh`: Optional, force token refresh

**Returns:** `Promise<string | null>` - Access token or null

**Note:** You typically don't need to call this directly; `fetchWithAuth()` handles it.

### clearCachedToken()

```typescript
function clearCachedToken(): void;
```

**Clears the in-memory token cache.**

**Note:** Called automatically by `fetchWithAuth()` on 401 responses.

---

## Migration Status

### ✅ Completed

1. `/src/Haas.Media.Web/lib/auth/fetch-with-auth.ts` - Core implementation
2. `/src/Haas.Media.Web/features/media/hooks/useEncodingApi.ts` - All methods migrated

### ⏳ Pending Migration

1. `/src/Haas.Media.Web/features/files/hooks/useFiles.ts` (partially done)
2. `/src/Haas.Media.Web/features/torrent/hooks/useTorrents.ts`
3. `/src/Haas.Media.Web/features/libraries/hooks/useLibraries.ts`
4. `/src/Haas.Media.Web/features/background-tasks/hooks/useBackgroundTasks.ts`
5. `/src/Haas.Media.Web/features/media/hooks/useEncodeStreams.ts`
6. `/src/Haas.Media.Web/features/media/hooks/useMetadata.ts`
7. `/src/Haas.Media.Web/features/media/hooks/useEncodingActions.ts`
8. `/src/Haas.Media.Web/lib/signalr/useMetadataSignalR.ts`
9. `/src/Haas.Media.Web/app/encodings/page.tsx`

**Estimated effort:** 5-10 minutes per file

---

## Security Considerations

### Token Storage

- Tokens are stored in HTTP-only cookies (secure)
- In-memory cache for client-side access
- Automatic cache clearing on 401

### Token Transmission

- Always use HTTPS in production
- Tokens sent via Authorization header
- Never expose tokens in URLs or logs

### Session Management

- Auth0 handles session expiry
- Automatic relogin on token expiry
- Return URL properly encoded to prevent injection

### Best Security Practices

1. **Use HTTPS in production** - Protect tokens in transit
2. **Don't log tokens** - Keep them out of console.log
3. **Validate on backend** - Client-side auth is not enough
4. **Use appropriate scopes** - Request minimum necessary permissions
5. **Monitor for abuse** - Track failed auth attempts

---

## Future Enhancements

### Planned Improvements

1. **Retry Logic** - Retry transient errors before redirecting
2. **User Notifications** - Toast message before redirect
3. **Request Queuing** - Queue failed requests, retry after relogin
4. **Telemetry** - Log authentication failures for monitoring
5. **Offline Support** - Better handling of network errors
6. **Token Refresh** - Proactive token refresh before expiry

### Contributing

When adding features:

1. Update this documentation
2. Add tests for new functionality
3. Follow existing patterns
4. Update TypeScript types
5. Consider backward compatibility

---

## Support & Resources

### Documentation Files

- **This file:** Complete authentication guide
- **Code:** `/src/Haas.Media.Web/lib/auth/fetch-with-auth.ts`
- **Auth0 Setup:** `/docs/infrastructure/auth0.md`

### External Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 Next.js SDK](https://github.com/auth0/nextjs-auth0)
- [MDN fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)

### Getting Help

1. Check this documentation first
2. Review example implementations
3. Check browser console for errors
4. Review backend logs
5. Consult team members

---

## Appendix

### Code Metrics

- **Lines of Code Saved:** ~3-5 per API call
- **Type Safety:** 100% TypeScript coverage
- **Error Reduction:** Eliminates manual token handling bugs
- **Maintainability:** Single source of truth for auth logic

### Version History

- **v1.0** (Oct 5, 2025) - Initial implementation with auto-relogin

---

**End of Documentation**
