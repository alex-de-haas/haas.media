# Local Authentication

This document describes the local authentication system added to Haas.Media as an alternative to Auth0.

## Overview

The application now supports two authentication modes:

1. **Auth0** (Cloud-based) - When `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` are configured
2. **Local Authentication** (LiteDB-based) - When `JWT_SECRET` is configured and Auth0 is not

## Backend Implementation

### Architecture

The local authentication system follows the established feature module pattern:

```
src/Haas.Media.Downloader.Api/Authentication/
├── User.cs                        # User model
├── LoginRequest.cs                # Login DTO
├── RegisterRequest.cs             # Registration DTO
├── AuthResponse.cs                # Auth response DTO
├── IAuthenticationApi.cs          # Service interface
├── AuthenticationService.cs       # Service implementation
└── AuthenticationConfiguration.cs # DI and endpoints
```

### Features

- **Password Hashing**: Uses BCrypt with work factor 12
- **JWT Tokens**: Self-signed JWT tokens for stateless authentication
- **User Store**: LiteDB-based user storage
- **Validation**: Username (min 3 chars), password (min 8 chars)
- **Admin Role**: First registered user is automatically marked as admin

### API Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with username and password
- `GET /api/auth/me` - Get current user info (requires auth)

### Configuration

Add to `.env`:

```env
# Required for local auth
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-long

# Optional (defaults shown)
JWT_ISSUER=haas-media-local
JWT_AUDIENCE=haas-media-api
JWT_EXPIRATION_MINUTES=1440  # 24 hours
```

## Frontend Implementation

### Components

- **LocalAuthProvider** (`features/auth/local-auth-context.tsx`) - Client-side auth context with direct API calls
- **Login Page** (`app/login/page.tsx`) - Supports both Auth0 and local auth
- **Register Page** (`app/register/page.tsx`) - Local user registration

### Features

- **Token Storage**: JWT stored in localStorage
- **Auto-login**: Checks stored token on mount
- **Unified UI**: UserMenu component works with both auth modes
- **Direct API Communication**: Frontend calls backend API directly (no Next.js proxy)
- **Logout**: Clears token and redirects to login

### Middleware

The middleware (`middleware.ts`) detects auth mode:

- **Auth0 mode**: Uses `withMiddlewareAuthRequired` from Auth0 SDK
- **Local mode**: Allows through (auth checked client-side)

## Authentication Mode Selection

The system automatically selects the authentication mode based on environment variables:

```typescript
// Backend (Program.cs)
if (AUTH0_DOMAIN && AUTH0_AUDIENCE) {
  // Use Auth0
} else if (JWT_SECRET) {
  // Use Local Auth
} else {
  // No auth configured
}

// Frontend (middleware.ts)
const useAuth0 = !!process.env.AUTH0_DOMAIN;
```

## Security Considerations

### Local Authentication

- ✅ Passwords hashed with BCrypt (work factor 12)
- ✅ JWT tokens with expiration
- ✅ HTTPS recommended for production
- ⚠️ No password reset (add if needed)
- ⚠️ No rate limiting (add if needed)

### Auth0 Authentication

- ✅ Enterprise-grade security
- ✅ MFA support
- ✅ Social logins
- ✅ Email verification
- ✅ Password reset

## Development Workflow

### Using Local Auth

1. Copy `.env.example` to `.env`
2. Generate a secret: `openssl rand -base64 48`
3. Set `JWT_SECRET` (remove or comment out Auth0 vars)
4. Start the app
5. Navigate to `/register` to create an account

### Using Auth0

1. Configure Auth0 application
2. Set Auth0 environment variables
3. Remove or comment out `JWT_SECRET`
4. Start the app
5. Use Auth0 login flow

## User Database

Users are stored in LiteDB at `{DATA_DIRECTORY}/.db/common.db` in the `users` collection:

```json
{
  "id": "guid",
  "username": "string",
  "passwordHash": "bcrypt hash",
  "isAdmin": "boolean",
  "createdAt": "datetime",
  "lastLoginAt": "datetime"
}
```

**Note:** The first user registered in the system is automatically granted admin privileges (`isAdmin: true`).

## Future Enhancements

- [ ] Password reset flow
- [ ] Rate limiting on auth endpoints
- [x] User roles and permissions (first user is admin)
- [ ] Additional role management UI
- [ ] Session management
- [ ] Remember me functionality
- [ ] Account lockout after failed attempts
- [ ] Audit logging
