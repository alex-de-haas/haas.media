# Local Authentication Implementation Summary

## Overview

Added a complete local authentication system using LiteDB as an alternative to Auth0. The system automatically detects which authentication mode to use based on environment variables.

## Changes Made

### Backend (.NET API)

#### New Files
- `Authentication/User.cs` - User model with BCrypt password hash
- `Authentication/LoginRequest.cs` - Login DTO
- `Authentication/RegisterRequest.cs` - Registration DTO  
- `Authentication/AuthResponse.cs` - Auth response with JWT token
- `Authentication/IAuthenticationApi.cs` - Service interface
- `Authentication/AuthenticationService.cs` - Service implementation with password hashing and JWT generation
- `Authentication/AuthenticationConfiguration.cs` - DI registration and API endpoints

#### Modified Files
- `Program.cs` - Added local JWT authentication alongside Auth0, auto-detects auth mode
- `Haas.Media.Downloader.Api.csproj` - Added BCrypt.Net-Next package reference

#### API Endpoints
- `POST /api/auth/register` - Register new user (username, email, password)
- `POST /api/auth/login` - Login with username/email and password
- `GET /api/auth/me` - Get current user info (requires authorization)

### Frontend (Next.js)

#### New Files
- `types/auth.ts` - TypeScript types for authentication
- `features/auth/local-auth-context.tsx` - React context for local auth state management
- `features/auth/use-auth-mode.tsx` - Hook to detect authentication mode
- `app/api/local-auth/login/route.ts` - Proxy to backend login endpoint
- `app/api/local-auth/register/route.ts` - Proxy to backend register endpoint
- `app/api/local-auth/me/route.ts` - Proxy to backend user info endpoint
- `app/register/page.tsx` - Registration page

#### Modified Files
- `app/login/page.tsx` - Updated to support both Auth0 and local authentication
- `middleware.ts` - Auto-detects auth mode and applies appropriate middleware
- `components/layout/client-layout.tsx` - Added LocalAuthProvider wrapper
- `components/layout/sidebar.tsx` - Updated UserMenu to support both auth modes

### Documentation
- `docs/backend/local-authentication.md` - Complete documentation for local auth

## Configuration

### Local Authentication

Add to `.env`:
```env
JWT_SECRET=your-very-long-random-secret-key-at-least-32-characters-long
JWT_ISSUER=haas-media-local
JWT_AUDIENCE=haas-media-api
JWT_EXPIRATION_MINUTES=1440
```

## How It Works

### Authentication Mode Selection

The system automatically selects authentication mode:

**Backend:**
```csharp
var auth0Domain = builder.Configuration["AUTH0_DOMAIN"];
var auth0Audience = builder.Configuration["AUTH0_AUDIENCE"];
var jwtSecret = builder.Configuration["JWT_SECRET"];

if (auth0Domain && auth0Audience) {
    // Configure Auth0
} else if (jwtSecret) {
    // Configure Local JWT Auth
} else {
    // No authentication
}
```

**Frontend:**
```typescript
const auth0Domain = env("NEXT_PUBLIC_AUTH0_DOMAIN");
const useAuth0 = !!auth0Domain;
```

### Local Authentication Flow

1. **Registration**: User submits username, email, password → Backend validates → Password hashed with BCrypt → User stored in LiteDB → JWT token generated and returned
2. **Login**: User submits credentials → Backend verifies against hashed password → JWT token generated and returned
3. **Token Storage**: Frontend stores JWT in localStorage
4. **API Requests**: Frontend includes JWT in Authorization header
5. **Logout**: Frontend clears localStorage and redirects to login

### Security Features

- **BCrypt password hashing** (work factor 12)
- **JWT tokens** with configurable expiration
- **Email validation**
- **Password requirements** (min 8 characters)
- **Username requirements** (min 3 characters)
- **Query string token support** for WebSocket/SignalR connections

## Testing

1. Generate a JWT secret:
   ```bash
   openssl rand -base64 48
   ```

2. Add to `.env`:
   ```env
   JWT_SECRET=<generated-secret>
   ```

3. Remove or comment out Auth0 variables

4. Start the application:
   ```bash
   dotnet run --project src/Haas.Media.Aspire
   ```

5. Navigate to `http://localhost:3000/register`
6. Create an account
7. Login with your credentials

## User Data

Users are stored in LiteDB at `{DATA_DIRECTORY}/.db/common.db` in the `users` collection.

Each user has:
- `id` (GUID)
- `username` (unique, min 3 chars)
- `email` (unique, validated)
- `passwordHash` (BCrypt)
- `createdAt` (UTC timestamp)
- `lastLoginAt` (UTC timestamp, nullable)

## Future Enhancements

Consider adding:
- Email verification flow
- Password reset functionality
- Rate limiting on auth endpoints
- Account lockout after failed attempts
- User roles and permissions
- Session management
- Audit logging
