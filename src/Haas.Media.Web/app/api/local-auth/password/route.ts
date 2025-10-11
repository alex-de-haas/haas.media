import { NextRequest, NextResponse } from "next/server";
import { env } from "next-runtime-env";

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const body = await request.json();
    const apiBaseUrl = env("NEXT_PUBLIC_API_BASE_URL") || "http://localhost:8000";

    const response = await fetch(`${apiBaseUrl}/api/auth/me/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(errorBody, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update password API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
