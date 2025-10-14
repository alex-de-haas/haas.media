import { getApiUrl } from "@/lib/api";
import {
  createAuthProxyContext,
  getResponseSummary,
  logAuthProxyError,
  logAuthProxyRequest,
  logAuthProxyResponse,
} from "@/lib/auth/proxy-logger";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(request: NextRequest) {
  const context = createAuthProxyContext("PUT /api/auth/me/password");

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const body = await request.json();
    const passwordEndpoint = new URL("/api/auth/me/password", getApiUrl()).toString();

    logAuthProxyRequest({
      requestId: context.requestId,
      operation: context.operation,
      method: "PUT",
      targetUrl: passwordEndpoint,
      hasAuthHeader: Boolean(authHeader),
      payload: body,
    });

    const response = await fetch(passwordEndpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
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
      const errorBody = await response.json().catch(() => ({}));
      return NextResponse.json(errorBody, { status: response.status });
    }

    return NextResponse.json({ success: true });
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
