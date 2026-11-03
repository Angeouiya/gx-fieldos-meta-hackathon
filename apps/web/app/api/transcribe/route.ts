import { createHash, timingSafeEqual } from "node:crypto";
import OpenAI from "openai";
import { agrixAccess, completeAgrixUsage } from "../../../lib/agrix-access.ts";

export const runtime = "nodejs";

const maxAudioBytes = 8_000_000;
const windows = new Map<string, { start: number; count: number }>();

function headers(request: Request) {
  const result = new Headers({ "Cache-Control": "no-store", Vary: "Origin" });
  const origin = request.headers.get("origin");
  const allowed = process.env.GX_CHAT_ALLOWED_ORIGINS?.split(",").map((item) => item.trim()) ?? [];
  if (origin && allowed.includes(origin)) result.set("Access-Control-Allow-Origin", origin);
  return result;
}

function respond(request: Request, status: number, body: object) {
  const h = headers(request);
  h.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers: h });
}

function allowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
  if (host && origin === `${protocol}://${host}`) return true;
  return process.env.GX_CHAT_ALLOWED_ORIGINS?.split(",").some((item) => item.trim() === origin) ?? false;
}

function authorized(request: Request, expected: string) {
  const provided = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!provided) return false;
  return timingSafeEqual(createHash("sha256").update(provided).digest(), createHash("sha256").update(expected).digest());
}

export function OPTIONS(request: Request) {
  if (!allowedOrigin(request)) return respond(request, 403, { error: "Origine non autorisée." });
  const h = headers(request);
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  h.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  return new Response(null, { status: 204, headers: h });
}

export async function POST(request: Request) {
  if (!allowedOrigin(request)) return respond(request, 403, { error: "Origine non autorisée." });
  const key = process.env.OPENAI_API_KEY?.trim();
  const token = process.env.GX_CHAT_ACCESS_TOKEN?.trim();
  if (!key) return respond(request, 503, { error: "La transcription est indisponible pour le moment." });
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxAudioBytes + 20_000) return respond(request, 413, { error: "Enregistrement trop volumineux." });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return respond(request, 415, { error: "Envoyez un enregistrement audio." });

  const session = await agrixAccess(request);
  if (session && session.status !== 200) return respond(request, session.status, { error: session.error });
  if (!session?.identity && (process.env.NODE_ENV === "production" || !token || !authorized(request, token))) {
    return respond(request, 401, { error: "Accès à la transcription non autorisé." });
  }

  const hash = createHash("sha256").update(session?.identity?.userId ?? token ?? "").digest("hex");
  const now = Date.now();
  const window = windows.get(hash);
  if (!window || now - window.start > 60_000) windows.set(hash, { start: now, count: 1 });
  else if (window.count >= 5) return respond(request, 429, { error: "Trop de transcriptions. Réessayez dans une minute." });
  else window.count += 1;

  let reservedEventId: string | undefined;
  let startedAt = 0;
  const finish = async (status: "succeeded" | "failed", failureCode?: string) => {
    if (!reservedEventId) return;
    const completed = await completeAgrixUsage(request, reservedEventId, status, {
      response: { model: "gpt-4o-mini-transcribe" }, durationMs: Date.now() - startedAt, failureCode,
    });
    if (!completed) console.error("[GX_TRANSCRIBE_USAGE] Could not complete Agrix usage event");
  };

  try {
    if (!request.body) return respond(request, 400, { error: "Enregistrement audio manquant." });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxAudioBytes + 20_000) {
        await reader.cancel();
        return respond(request, 413, { error: "Enregistrement trop volumineux." });
      }
      chunks.push(value);
    }
    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const form = await new Response(new Blob([body.buffer]), { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size < 100 || audio.size > maxAudioBytes || !audio.type.startsWith("audio/")) {
      return respond(request, 400, { error: "Enregistrement audio invalide ou trop volumineux." });
    }
    const agrix = session?.identity ? await agrixAccess(request, "transcription") : null;
    if (agrix && agrix.status !== 200) return respond(request, agrix.status, { error: agrix.error });
    reservedEventId = agrix?.usageEventId;
    startedAt = Date.now();
    const client = new OpenAI({ apiKey: key, timeout: 60_000, maxRetries: 0 });
    const result = await client.audio.transcriptions.create({ model: "gpt-4o-mini-transcribe", file: audio });
    const text = result.text?.trim().slice(0, 4000);
    if (!text) {
      await finish("failed", "empty_transcript");
      return respond(request, 502, { error: "Aucune parole reconnue. Réessayez." });
    }
    await finish("succeeded");
    return respond(request, 200, { text });
  } catch {
    await finish("failed", "transcription_failed");
    return respond(request, 502, { error: "La transcription n’a pas abouti. Réessayez." });
  }
}
