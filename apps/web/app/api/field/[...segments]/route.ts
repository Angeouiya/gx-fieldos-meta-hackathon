import { proxyFieldRequest } from "../../../../lib/field-proxy.ts";
import { handleLocalFieldDemo } from "../../../../lib/field-demo.ts";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ segments: string[] }> };

async function forward(request: Request, context: Context) {
  const { segments } = await context.params;
  if (process.env.NODE_ENV !== "production" && process.env.GX_FIELD_DEMO_MODE === "true") {
    const host = new URL(request.url).hostname;
    if (host === "localhost" || host === "127.0.0.1") return handleLocalFieldDemo(request, segments);
  }
  return proxyFieldRequest(request, segments);
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const PUT = forward;
export const DELETE = forward;
