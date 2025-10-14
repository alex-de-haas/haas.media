import { getApiUrl } from "@/lib/api";
import {
  createAuthProxyContext,
  getResponseSummary,
  logAuthProxyError,
  logAuthProxyRequest,
  logAuthProxyResponse,
} from "@/lib/auth/proxy-logger";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const context = createAuthProxyContext("GET /api/auth/me");

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const currentUserEndpoint = new URL("/api/auth/me", getApiUrl()).toString();

    logAuthProxyRequest({
      requestId: context.requestId,
      operation: context.operation,
      method: "GET",
      targetUrl: currentUserEndpoint,
      hasAuthHeader: Boolean(authHeader),
    });

    const response = await fetch(currentUserEndpoint, {
      headers: {
        Authorization: authHeader,
      },
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
      return NextResponse.json({ error: "Unauthorized" }, { status: response.status });
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

export async function PUT(request: NextRequest) {
  const context = createAuthProxyContext("PUT /api/auth/me");

  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "No authorization header" }, { status: 401 });
    }

    const body = await request.json();
    const currentUserEndpoint = new URL("/api/auth/me", getApiUrl()).toString();

    logAuthProxyRequest({
      requestId: context.requestId,
      operation: context.operation,
      method: "PUT",
      targetUrl: currentUserEndpoint,
      hasAuthHeader: Boolean(authHeader),
      payload: body,
    });

    const response = await fetch(currentUserEndpoint, {
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
