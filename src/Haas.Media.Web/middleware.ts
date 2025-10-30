import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";

// Create the internationalization middleware
const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Handle internationalization first
  const intlResponse = intlMiddleware(request);

  // Get the locale from the pathname or use default
  const pathnameLocale = pathname.split("/")[1];
  const locale = routing.locales.includes(pathnameLocale as (typeof routing.locales)[number]) ? pathnameLocale : routing.defaultLocale;

  // Allow public routes (with locale prefix)
  if (pathname === `/${locale}/login` || pathname === `/${locale}/register` || pathname === "/login" || pathname === "/register") {
    return intlResponse;
  }

  // Check for auth token in cookie or localStorage (handled client-side)
  // For server-side, we just allow through since local auth is handled client-side
  return intlResponse;
}

export const config = {
  matcher: [
    // Enable a redirect to a matching locale at the root
    "/",

    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    "/(nl|de|es|fr|ja|zh|en)/:path*",

    // Protect all routes except API routes, static files
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
