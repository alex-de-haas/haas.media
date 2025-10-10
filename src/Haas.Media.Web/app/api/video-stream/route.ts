import { NextRequest, NextResponse } from "next/server";

async function handler(req: NextRequest) {
  try {
    // Get the file path from query params
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path");

    if (!path) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }

    // Get the token from the Authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      console.error("No access token available for video stream request");
      return NextResponse.json({ error: "Unauthorized - No access token" }, { status: 401 });
    }

    // Build the downstream API URL
    const downloaderApi = process.env.NEXT_PUBLIC_DOWNLOADER_API || "http://localhost:8000";
    const apiUrl = `${downloaderApi}/api/files/stream?path=${encodeURIComponent(path)}`;

    console.log(`[video-stream] Streaming video from: ${apiUrl}`);

    // Get range header from incoming request
    const range = req.headers.get("range");

    if (range) {
      console.log(`[video-stream] Range request: ${range}`);
    }

    // Prepare headers for the downstream request
    const headers: HeadersInit = {
      Authorization: `Bearer ${token}`,
    };

    if (range) {
      headers.Range = range;
    }

    // Fetch from downstream API
    const response = await fetch(apiUrl, {
      headers,
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      console.error(`[video-stream] Failed to fetch video from ${apiUrl}`);
      console.error(`[video-stream] Status: ${response.status} ${response.statusText}`);
      console.error(`[video-stream] Response body: ${errorText}`);

      const isDev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          error: `Failed to fetch video: ${response.statusText}`,
          details: errorText,
          ...(isDev && {
            debugInfo: {
              url: apiUrl,
              status: response.status,
              hasToken: !!token,
            },
          }),
        },
        { status: response.status },
      );
    }

    // Stream the response directly without buffering
    // This is crucial for large video files and proper range request handling
    const responseHeaders = new Headers();

    // Copy important headers from downstream response
    const headersToProxy = ["content-type", "content-length", "content-range", "accept-ranges", "cache-control"];

    headersToProxy.forEach((headerName) => {
      const value = response.headers.get(headerName);
      if (value) {
        responseHeaders.set(headerName, value);
      }
    });

    // Log response details for debugging
    const contentRange = response.headers.get("content-range");
    if (contentRange) {
      console.log(`[video-stream] Proxying partial content: ${contentRange}`);
    }

    // Return the video stream directly (no buffering)
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("Error streaming video:", error);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(isDev && { details: error instanceof Error ? error.message : String(error) }),
      },
      { status: 500 },
    );
  }
}

export const GET = handler;
