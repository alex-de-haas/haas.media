import { NextRequest, NextResponse } from "next/server";
import { env } from "next-runtime-env";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const apiBaseUrl = env("NEXT_PUBLIC_API_BASE_URL") || "http://localhost:8000";

    const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
      headers: {
        Authorization: authHeader,
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Get user API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
