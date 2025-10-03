# Auth0 Integration

Auth0 secures both the ASP.NET API and the Next.js client. Tokens use RS256 signing keys so the API can validate bearer tokens without client secrets.

## Auth0 Dashboard Setup

1. **Create an API** (e.g. `haas-media-api`).
   - Identifier → reuse as `AUTH0_AUDIENCE`.
   - Enable RS256 (default).
2. **Create a Regular Web Application** for the Next.js frontend.
   - Allowed Callback URLs: `http://localhost:3000/api/auth/callback` (add additional domains for deployed environments).
   - Allowed Logout URLs: `http://localhost:3000`.
   - Allowed Web Origins: `http://localhost:3000`.

## Backend Configuration (`Haas.Media.Downloader.Api`)

Set the following environment variables or appsettings entries:

```env
AUTH0_DOMAIN=your-tenant.eu.auth0.com
AUTH0_AUDIENCE=https://haas-media-api
```

During startup the API enables JWT bearer authentication only when both variables are present. SignalR connections pass the token as `?access_token=` automatically.

## Frontend Configuration (`Haas.Media.Web`)

Create `src/Haas.Media.Web/.env.local` with:

```env
AUTH0_SECRET=generated-random-string
AUTH0_BASE_URL=http://localhost:3000
AUTH0_DOMAIN=your-tenant.eu.auth0.com
AUTH0_AUDIENCE=https://haas-media-api
AUTH0_CLIENT_ID=XXXXXXXXXXXX
AUTH0_CLIENT_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

`AUTH0_SECRET` should be a high-entropy string (e.g. `openssl rand -hex 32`). Keep secrets out of version control.

## Local Development Checklist

- Update the Auth0 application **Allowed Origins** to include your dev hostname when using HTTPS tunnels.
- Ensure the API Identifier exactly matches `AUTH0_AUDIENCE` or token validation will fail with `Invalid issuer/audience` errors.
- If you disable Auth0 temporarily, omit both environment variables. The API will skip JWT middleware (useful for local smoke tests without auth).

## Related Documents

- Application bootstrap details live in `src/Haas.Media.Downloader.Api/Program.cs`.
- Frontend authentication hooks are defined in the Next.js app under `src/Haas.Media.Web`.
