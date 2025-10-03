import { getAccessToken, withApiAuthRequired } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";

// Optional: set AUTH0_AUDIENCE in your environment if you need an API audience
const audience = process.env.AUTH0_AUDIENCE;

export const GET = withApiAuthRequired(async () => {
  const res = new NextResponse();
  try {
    // First try without forcing refresh (no need for refresh token)
    // In App Router, getAccessToken infers request from the context; no need to pass req/res.
    const tokenRequest = audience ? { authorizationParams: { audience } } : null;
    const tokenResult = tokenRequest ? await getAccessToken(tokenRequest) : await getAccessToken();
    const { accessToken } = tokenResult;

    if (!accessToken) {
      throw new Error("No access token returned");
    }

    const response = NextResponse.json({ accessToken });
    const setCookieHeadersInitial = res.headers.get("set-cookie");
    if (setCookieHeadersInitial) {
      for (const cookie of setCookieHeadersInitial.split(/,(?=[^;]+?=)/)) {
        response.headers.append("Set-Cookie", cookie.trim());
      }
    }
    return response;
  } catch (initialError) {
    const { message: msg, status: initialStatus, code } = getErrorDetails(initialError);
    const needsRefresh = /expired/i.test(msg);
    if (!needsRefresh) {
      console.error("[api/token] access token fetch failed", initialError);
      const status = initialStatus ?? (code === "invalid_session" ? 401 : 500);
      return NextResponse.json({ error: "Unable to fetch access token", details: msg }, { status });
    }

    // Attempt refresh only if token expired.
    try {
      const refreshOptions = audience
        ? { refresh: true, authorizationParams: { audience } }
        : { refresh: true };
      const refreshed = await getAccessToken(refreshOptions);
      if (!refreshed.accessToken) {
        throw new Error("Refresh attempted but no access token returned");
      }
      const response = NextResponse.json({ accessToken: refreshed.accessToken, refreshed: true });
      const setCookieHeaders = res.headers.get("set-cookie");
      if (setCookieHeaders) {
        for (const cookie of setCookieHeaders.split(/,(?=[^;]+?=)/)) {
          response.headers.append("Set-Cookie", cookie.trim());
        }
      }
      return response;
    } catch (refreshError) {
      const { message: refreshMsg } = getErrorDetails(refreshError);
      if (/refresh token.*required/i.test(refreshMsg) || /no refresh token/i.test(refreshMsg)) {
        // User session lacks refresh token (likely offline_access not requested). Force re-login.
        return NextResponse.json(
          { error: "Session has no refresh token – please log in again", code: "no_refresh_token" },
          { status: 401 },
        );
      }
      console.error("[api/token] refresh attempt failed", refreshError);
      return NextResponse.json({ error: "Unable to refresh access token", details: refreshMsg }, { status: 500 });
    }
  }
});

function getErrorDetails(error: unknown) {
  if (error && typeof error === "object") {
    const { message, status, code } = error as {
      message?: unknown;
      status?: unknown;
      code?: unknown;
    };

    return {
      message: typeof message === "string" ? message : "",
      status: typeof status === "number" ? status : undefined,
      code: typeof code === "string" ? code : undefined,
    } as const;
  }

  return { message: "", status: undefined, code: undefined } as const;
}
