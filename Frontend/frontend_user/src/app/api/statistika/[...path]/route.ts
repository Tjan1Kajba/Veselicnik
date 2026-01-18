import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, context: any) {
  try {
    // Build path from incoming request to avoid missing context.params
    const incomingPath = request.nextUrl?.pathname || request.url || "";
    const prefix = "/api/statistika";
    let path = "";
    if (incomingPath.startsWith(prefix)) {
      path = incomingPath.slice(prefix.length).replace(/^\/+/, "");
    }
    const base =
      process.env.STATISTIKA_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:8000/statistika"
        : "https://veselicnik.onrender.com/statistika");
    const target = `${base.replace(/\/$/, "")}/${path}`;

    // Debug logging to help trace 405/target issues in development
    try {
      // eslint-disable-next-line no-console
      console.log("[statistika proxy] GET ->", target);
    } catch (e) {}

    const res = await fetch(target, {
      method: "GET",
      headers: {
        accept: request.headers.get("accept") || "application/json",
      },
    });

    // If backend returns non-OK, log response text for debugging
    const body = await res.arrayBuffer();
    if (!res.ok) {
      try {
        const txt = new TextDecoder().decode(body);
        // eslint-disable-next-line no-console
        console.error("[statistika proxy] target response", res.status, txt);
      } catch (e) {}
    }
    const headers: Record<string, string> = {};
    const contentType = res.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;

    return new Response(body, {
      status: res.status,
      headers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

export async function OPTIONS(request: NextRequest, context: any) {
  return new Response(null, {
    status: 200,
    headers: {
      Allow: "GET, HEAD, OPTIONS",
    },
  });
}

export async function HEAD(request: NextRequest, context: any) {
  try {
    // Proxy HEAD to the target as GET but discard body
    const incomingPath = request.nextUrl?.pathname || request.url || "";
    const prefix = "/api/statistika";
    let path = "";
    if (incomingPath.startsWith(prefix)) {
      path = incomingPath.slice(prefix.length).replace(/^\/+/, "");
    }
    const base =
      process.env.STATISTIKA_URL ||
      (process.env.NODE_ENV === "development"
        ? "http://localhost:8000/statistika"
        : "http://statistika_service:8000/statistika");
    const target = `${base.replace(/\/$/, "")}/${path}`;

    const res = await fetch(target, { method: "HEAD" });
    const headers: Record<string, string> = {};
    const contentType = res.headers.get("content-type");
    if (contentType) headers["content-type"] = contentType;
    return new Response(null, { status: res.status, headers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
