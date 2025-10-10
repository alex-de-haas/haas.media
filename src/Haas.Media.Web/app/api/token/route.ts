import { NextResponse } from "next/server";

// Legacy endpoint for token retrieval - now handled client-side via localStorage
// This endpoint is kept for backward compatibility but returns an error
// encouraging direct localStorage access via lib/auth/token.ts

export async function GET() {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use localStorage.getItem('auth_token') or getValidToken() from lib/auth/token.ts instead.",
    },
    { status: 410 }, // 410 Gone - indicates the resource is no longer available
  );
}

export async function POST() {
  return NextResponse.json(
    {
      error: "This endpoint is deprecated. Use localStorage.getItem('auth_token') or getValidToken() from lib/auth/token.ts instead.",
    },
    { status: 410 },
  );
}
