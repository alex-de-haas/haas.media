import { NextRequest, NextResponse } from "next/server";
import { env } from "next-runtime-env";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const apiBaseUrl = env("NEXT_PUBLIC_API_BASE_URL") || "http://localhost:8000";

    const response = await fetch(`${apiBaseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Registration failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Registration API error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
