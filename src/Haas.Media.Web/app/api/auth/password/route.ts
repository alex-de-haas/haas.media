import { getApiUrl } from "@/lib/env";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const body = await request.json();
    const passwordEndpoint = new URL("/api/auth/me/password", getApiUrl()).toString();

    const response = await fetch(passwordEndpoint, {
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
