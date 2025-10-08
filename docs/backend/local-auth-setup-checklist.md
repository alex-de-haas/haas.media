# Local Authentication Setup Checklist

Use this checklist to set up local authentication for Haas.Media.

## Prerequisites

- [ ] .NET 9 SDK installed
- [ ] Node.js 18+ installed
- [ ] Repository cloned

## Backend Setup

- [ ] Generate a JWT secret:
  ```bash
  ./scripts/generate-jwt-secret.sh
  ```
  Or manually:
  ```bash
  openssl rand -base64 48
  ```

- [ ] Create/update `.env.local` in project root:
  ```env
  DATA_DIRECTORY=/path/to/data
  FFMPEG_BINARY=/usr/bin/ffmpeg
  TMDB_API_KEY=your_tmdb_api_key
  JWT_SECRET=<your-generated-secret>
  JWT_ISSUER=haas-media-local
  JWT_AUDIENCE=haas-media-api
  JWT_EXPIRATION_MINUTES=1440
  ```

- [ ] Ensure Auth0 variables are NOT set (comment them out if present)

- [ ] Restore .NET packages:
  ```bash
  dotnet restore
  ```

## Frontend Setup

- [ ] Install npm dependencies:
  ```bash
  cd src/Haas.Media.Web
  npm install
  ```

- [ ] Verify NEXT_PUBLIC_API_BASE_URL is set (optional):
  ```env
  NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
  ```

## Run the Application

- [ ] Start via .NET Aspire:
  ```bash
  cd src/Haas.Media.Aspire
  dotnet run
  ```

- [ ] Check console output for authentication mode:
  ```
  🔐 Local JWT Authentication ENABLED
     Issuer: haas-media-local
     Audience: haas-media-api
  ```

## Test Local Authentication

- [ ] Open browser to http://localhost:3000

- [ ] Navigate to `/register`

- [ ] Create a test account:
  - Username: `testuser` (min 3 chars)
  - Email: `test@example.com`
  - Password: `password123` (min 8 chars)

- [ ] Verify registration success and auto-login

- [ ] Check that username appears in sidebar

- [ ] Logout and login again with same credentials

- [ ] Verify login success

## Verify User Storage

- [ ] Check LiteDB for user:
  ```bash
  # Users stored at: {DATA_DIRECTORY}/.db/common.db
  # Collection: users
  ```

- [ ] User should have:
  - `id` (GUID)
  - `username`
  - `email`
  - `passwordHash` (BCrypt)
  - `createdAt`
  - `lastLoginAt`

## Test API Endpoints

- [ ] Test registration endpoint:
  ```bash
  curl -X POST http://localhost:8000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser2","email":"test2@example.com","password":"password123"}'
  ```

- [ ] Test login endpoint:
  ```bash
  curl -X POST http://localhost:8000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"password123"}'
  ```

- [ ] Save the returned token

- [ ] Test authenticated endpoint:
  ```bash
  curl http://localhost:8000/api/auth/me \
    -H "Authorization: Bearer <your-token>"
  ```

## Switch to Auth0 (Optional)

If you want to switch back to Auth0:

- [ ] Comment out or remove `JWT_SECRET` from `.env.local`

- [ ] Uncomment and configure Auth0 variables:
  ```env
  AUTH0_DOMAIN=your-domain.auth0.com
  AUTH0_AUDIENCE=your-api-identifier
  AUTH0_SECRET=your-auth0-secret
  AUTH0_BASE_URL=http://localhost:3000
  AUTH0_CLIENT_ID=your-client-id
  AUTH0_CLIENT_SECRET=your-client-secret
  ```

- [ ] Restart the application

- [ ] Verify console shows:
  ```
  🔐 Auth0 Authentication ENABLED
     Domain: your-domain.auth0.com
     Audience: your-api-identifier
  ```

## Troubleshooting

### "Registration failed"
- Check password is at least 8 characters
- Check username is at least 3 characters
- Check email is valid format
- Check username/email not already taken

### "Authentication failed"
- Verify JWT_SECRET is set correctly
- Check token hasn't expired
- Verify token is included in Authorization header

### "No authentication configured"
- Ensure either JWT_SECRET or (AUTH0_DOMAIN + AUTH0_AUDIENCE) is set
- Check .env.local file is in project root
- Restart the application after changing env vars

### "KeyNotFoundException: The given key 'AUTH0_DOMAIN' was not present"
- This means .env.local is missing or not in the correct location
- Create .env.local in the project root directory
- Add at minimum: `DATA_DIRECTORY`, `FFMPEG_BINARY`, `TMDB_API_KEY`, and `JWT_SECRET`
- The AppHost.cs now safely handles missing environment variables

## Security Notes

- ✅ Passwords are hashed with BCrypt (work factor 12)
- ✅ JWT tokens expire after configured time (default 24 hours)
- ⚠️ Use HTTPS in production
- ⚠️ Generate a strong JWT_SECRET (at least 32 characters)
- ⚠️ Consider adding rate limiting for production
- ⚠️ Consider adding email verification for production

## Next Steps

After successful setup, consider:

- [ ] Review [Local Authentication Documentation](./local-authentication.md)
- [ ] Set up email verification (future enhancement)
- [ ] Implement password reset flow (future enhancement)
- [ ] Add rate limiting (future enhancement)
- [ ] Configure user roles and permissions (future enhancement)
