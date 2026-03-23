// ============================================================
// API Proxy — Forwards all /api-proxy/* requests to the backend.
// Keeps the backend URL server-side only, fixing cross-origin
// "Failed to fetch" issues when the frontend is accessed via LAN.
// ============================================================

import { NextRequest, NextResponse } from "next/server";

// Internal backend URL — only readable server-side (no NEXT_PUBLIC_ prefix).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8081";

// These headers must NOT be forwarded to the browser.
// Node's fetch automatically decompresses gzip/br responses, so forwarding
// Content-Encoding would cause the browser to try a second decompress and fail
// with net::ERR_CONTENT_DECODING_FAILED.
const HOP_BY_HOP_HEADERS = new Set([
  "content-encoding",
  "transfer-encoding",
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "trailer",
  "upgrade",
]);

/**
 * Proxy handler for all HTTP methods.
 * Strips the /api-proxy prefix and forwards the remainder to the backend.
 * Example: POST /api-proxy/sessions → POST http://localhost:8081/api/sessions
 *
 * Returns a 502 Bad Gateway with a JSON body if the backend is unreachable,
 * so the browser always receives a structured error instead of a silent crash.
 */
async function handler(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await context.params;
  const backendPath = path.join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${BACKEND_URL}/api/${backendPath}${search}`;

  // Strip the host header so the backend doesn't get confused by the LAN hostname.
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  // Tell the backend we accept plain JSON (not compressed) so Node's fetch
  // won't decompress a gzip body and leave a stale Content-Encoding header.
  upstreamHeaders.set("accept-encoding", "identity");

  const body: BodyInit | undefined =
    request.method !== "GET" && request.method !== "HEAD"
      ? await request.arrayBuffer()
      : undefined;

  // Attempt to reach the backend. On network failure return 502 immediately
  // so the browser receives a structured JSON error, not a blank crash page.
  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Backend unreachable";
    return NextResponse.json(
      { error: { code: "BACKEND_UNREACHABLE", message } },
      { status: 502 }
    );
  }

  // Build safe response headers — drop hop-by-hop headers that must not
  // be forwarded (e.g. Content-Encoding after Node has already decompressed).
  const safeHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      safeHeaders.set(key, value);
    }
  });

  const responseBody = await upstream.arrayBuffer();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: safeHeaders,
  });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const PATCH = handler;
