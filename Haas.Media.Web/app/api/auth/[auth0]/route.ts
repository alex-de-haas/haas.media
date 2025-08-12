import { handleAuth } from '@auth0/nextjs-auth0';

// Route handlers for Auth0 in the App Router.
// Supports /api/auth/login, /api/auth/logout, /api/auth/callback, /api/auth/me
export const GET = handleAuth();
export const POST = handleAuth();
