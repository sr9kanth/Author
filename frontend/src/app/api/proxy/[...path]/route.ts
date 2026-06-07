import { NextRequest } from "next/server";

// Runtime proxy to the backend. We deliberately do NOT use next.config.mjs
// `rewrites()` for this: Next.js evaluates rewrite destinations at BUILD time
// and bakes them into routes-manifest.json, so a runtime BACKEND_URL set in
// docker-compose has no effect (the destination freezes to whatever was set
// when `next build` ran — i.e. the localhost fallback). A Route Handler reads
// process.env on every request, so BACKEND_URL works at runtime in any env.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function backendBase(): string {
  return (
    process.env.BACKEND_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:8000"
  );
}

// Hop-by-hop headers that must not be forwarded (RFC 7230 §6.1).
const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

async function handle(req: NextRequest, path: string[]): Promise<Response> {
  const search = req.nextUrl.search;
  const target = `${backendBase()}/api/${path.join("/")}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";
  const body = hasBody ? await req.arrayBuffer() : undefined;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ detail: `Upstream request failed: ${(err as Error).message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );
  }

  const respHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) respHeaders.set(key, value);
  });

  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers: respHeaders });
}

type Ctx = { params: { path: string[] } };

export async function GET(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx.params.path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx.params.path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx.params.path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx.params.path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return handle(req, ctx.params.path);
}
