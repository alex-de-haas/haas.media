import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";
import { NextResponse } from "next/server";

export default withMiddlewareAuthRequired(async () => {
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Protect all routes under app, except API routes (they handle their own auth), login, and static files
    "/((?!api|login|_next/static|_next/image|favicon.ico).*)",
  ],
};
