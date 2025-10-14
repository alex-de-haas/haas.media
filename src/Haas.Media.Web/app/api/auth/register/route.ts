import { getApiUrl } from "@/lib/api";
import {
  createAuthProxyContext,
  getResponseSummary,
  logAuthProxyError,
  logAuthProxyRequest,
  logAuthProxyResponse,
} from "@/lib/auth/proxy-logger";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const context = createAuthProxyContext("POST /api/auth/register");

  try {
    const body = await request.json();
    const registerEndpoint = new URL("/api/auth/register", getApiUrl()).toString();

    logAuthProxyRequest({
      requestId: context.requestId,
      operation: context.operation,
      method: "POST",
      targetUrl: registerEndpoint,
      payload: body,
    });

    const response = await fetch(registerEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseSummary = await getResponseSummary(response);
    logAuthProxyResponse({
      requestId: context.requestId,
      operation: context.operation,
      status: response.status,
      ok: response.ok,
      durationMs: Date.now() - context.startedAt,
      payload: responseSummary,
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Registration failed" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    logAuthProxyError({
      requestId: context.requestId,
      operation: context.operation,
      durationMs: Date.now() - context.startedAt,
      error,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
