# Authentication Documentation

## 📖 Main Documentation

**[→ Complete Authentication Guide](./AUTHENTICATION-COMPLETE-GUIDE.md)**

The complete authentication guide contains everything you need:
- Quick start guide
- API reference
- Migration instructions
- Common patterns
- Troubleshooting
- Best practices

## 📚 Quick Links

### For New Users
- [Quick Start](#quick-start)
- [Basic Usage Examples](#usage-examples)

### For Developers
- [Migration Guide](./AUTHENTICATION-COMPLETE-GUIDE.md#migration-guide)
- [API Reference](./AUTHENTICATION-COMPLETE-GUIDE.md#api-reference)
- [Common Patterns](./AUTHENTICATION-COMPLETE-GUIDE.md#common-patterns)

### For Troubleshooting
- [Troubleshooting Guide](./AUTHENTICATION-COMPLETE-GUIDE.md#troubleshooting)
- [Testing Guide](./AUTHENTICATION-COMPLETE-GUIDE.md#testing)

---

## Quick Start

### 1. Import the functions

```typescript
import { fetchWithAuth, fetchJsonWithAuth } from "@/lib/auth/fetch-with-auth";
```

### 2. Replace your fetch calls

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

### 3. Or use the JSON helper

```typescript
const data = await fetchJsonWithAuth<DataType>("/api/endpoint");
```

---

## Usage Examples

### GET Request
```typescript
const files = await fetchJsonWithAuth<FileItem[]>("/api/files");
```

### POST Request
```typescript
await fetchWithAuth("/api/files", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "test" }),
});
```

### DELETE Request
```typescript
await fetchWithAuth(`/api/files/${id}`, { method: "DELETE" });
```

### File Upload
```typescript
const formData = new FormData();
formData.append("file", file);
await fetchWithAuth("/api/upload", { method: "POST", body: formData });
```

---

## What It Does

When you use `fetchWithAuth()` or `fetchJsonWithAuth()`:

✅ Automatically adds your authentication token  
✅ Handles 401 (Unauthorized) responses  
✅ Redirects to login when needed  
✅ Brings you back to your page after login  
✅ Clears stale tokens automatically  

---

## When to Use Each Function

| Function | Best For |
|----------|----------|
| `fetchJsonWithAuth<T>()` | Simple GET/POST requests with JSON responses |
| `fetchWithAuth()` | File uploads, custom headers, or when you need the full Response object |

---

## Need More Info?

**Read the [Complete Authentication Guide](./AUTHENTICATION-COMPLETE-GUIDE.md)** for:
- Detailed API reference
- Step-by-step migration guide
- Troubleshooting tips
- Best practices
- Security considerations
- And much more!

---

## Legacy Documentation (Archived)

The following documents have been consolidated into the Complete Guide:

- `authentication-relogin.md` - See [Complete Guide - Overview](./AUTHENTICATION-COMPLETE-GUIDE.md#overview)
- `auto-relogin-implementation.md` - See [Complete Guide - Implementation](./AUTHENTICATION-COMPLETE-GUIDE.md#core-implementation)
- `fetch-with-auth-migration.md` - See [Complete Guide - Migration](./AUTHENTICATION-COMPLETE-GUIDE.md#migration-guide)
- `QUICK-REFERENCE-fetchWithAuth.md` - See [Complete Guide - Quick Start](./AUTHENTICATION-COMPLETE-GUIDE.md#quick-start)
- `AUTO-RELOGIN-SUMMARY.md` - See [Complete Guide - Overview](./AUTHENTICATION-COMPLETE-GUIDE.md#overview)

---

**Last Updated:** October 5, 2025
