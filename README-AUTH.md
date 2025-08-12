# Auth0 Integration

Configure Auth0 for both the API and Web app.
In Auth0 API settings enable RS256.

## Web (Haas.Media.Web)

Create `.env.local` and fill in values:
```
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_DOMAIN=
AUTH0_AUDIENCE=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
```

Ensure Allowed Callback/Logout URLs in Auth0 Application include `http://localhost:3000/api/auth/callback` and `http://localhost:3000`.
