import { NextRequest, NextResponse } from "next/server";

async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }

  // Check for auth token in cookie or localStorage (handled client-side)
  // For server-side, we just allow through since local auth is handled client-side
  return NextResponse.next();
}

export default authMiddleware;

export const config = {
  matcher: [
    // Protect all routes under app, except API routes (they handle their own auth), login, register, and static files
    "/((?!api|login|register|_next/static|_next/image|favicon.ico).*)",
  ],
};
