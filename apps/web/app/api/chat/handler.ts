import { createHash, timingSafeEqual } from "node:crypto";

import { runTurn } from "@gx/core";
import { agrixAccess, completeAgrixUsage } from "../../../lib/agrix-access.ts";
import { gxProviderModel, type GXModelProvider } from "../../../lib/model-provider.ts";

const MAX_BODY_BYTES = 32_768;
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4_000;
const MAX_HISTORY_LENGTH = 12_000;
const RATE_WINDOW_MS = 60_000;

// This protects one Node process only. Other server instances keep independent windows.
const requestWindows = new Map<string, { startedAt: number; count: number }>();

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatConfig {
  apiKey?: string;
  provider?: GXModelProvider;
  accessToken?: string;
  model?: string;
  allowedOrigins?: string;
  requestsPerMinute?: string;
  maxOutputTokens?: string;
}

export interface ChatGenerationRequest {
  model: string;
  instructions: string;
  input: ChatMessage[];
  store: false;
  max_output_tokens: number;
}

export type ChatGenerator = (
  request: ChatGenerationRequest,
  apiKey: string,
  signal?: AbortSignal,
) => Promise<{ output_text?: string | null; model?: string; usage?: unknown }>;

function responseHeaders(request: Request, allowedOrigins = ""): Headers {
  const headers = new Headers({
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins.split(",").some((entry) => entry.trim() === origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

function requestOrigin(request: Request): string {
  const internalUrl = new URL(request.url);
  const host = request.headers.get("host")?.trim();
  if (!host) return internalUrl.origin;

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? `${forwardedProtocol}:`
    : internalUrl.protocol;
  try {
    const publicUrl = new URL(`${protocol}//${host}`);
    if (publicUrl.host === host.toLowerCase() && publicUrl.pathname === "/") {
      return publicUrl.origin;
    }
  } catch {
    // Fall back to the URL provided by the runtime when Host is malformed.
  }
  return internalUrl.origin;
}

function isAllowedOrigin(request: Request, allowedOrigins = ""): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  if (origin === requestOrigin(request)) return true;
  return allowedOrigins.split(",").some((entry) => entry.trim() === origin);
}

function json(request: Request, status: number, body: object, allowedOrigins = ""): Response {
  const headers = responseHeaders(request, allowedOrigins);
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

function authorized(request: Request, expected: string): boolean {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  const token = match?.[1];
  if (!token) return false;
  const actualHash = createHash("sha256").update(token).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actualHash, expectedHash);
}

function boundedInteger(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const trimmed = value?.trim();
  if (!trimmed || !/^\d+$/.test(trimmed)) return fallback;
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function reserveRequest(accessToken: string, limit: number): number | null {
  const key = createHash("sha256").update(accessToken).digest("hex");
  const now = Date.now();
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    if (requestWindows.size > 100) {
      for (const [oldKey, window] of requestWindows) {
        if (now - window.startedAt >= RATE_WINDOW_MS) requestWindows.delete(oldKey);
      }
    }
    return null;
  }
  if (current.count >= limit) {
    return Math.max(1, Math.ceil((RATE_WINDOW_MS - (now - current.startedAt)) / 1_000));
  }
  current.count += 1;
  return null;
}

async function readLimitedBody(request: Request): Promise<string | null> {
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return null;

  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
  return body + decoder.decode();
}

function validateMessages(value: unknown): ChatMessage[] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const object = value as Record<string, unknown>;
  if (Object.keys(object).length !== 1 || !Array.isArray(object.messages)) return null;
  if (object.messages.length < 1 || object.messages.length > MAX_MESSAGES) return null;

  const messages: ChatMessage[] = [];
  let totalLength = 0;
  for (const entry of object.messages) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const message = entry as Record<string, unknown>;
    if (Object.keys(message).length !== 2 || !("role" in message) || !("content" in message)) {
      return null;
    }
    if (message.role !== "user" && message.role !== "assistant") return null;
    if (typeof message.content !== "string") return null;
    const content = message.content.trim();
    if (!content || content.length > MAX_MESSAGE_LENGTH) return null;
    totalLength += content.length;
    if (totalLength > MAX_HISTORY_LENGTH) return null;
    messages.push({ role: message.role, content });
  }

  if (messages.at(0)?.role !== "user" || messages.at(-1)?.role !== "user") {
    return null;
  }
  return messages;
}

export function handleChatOptions(request: Request, config: ChatConfig): Response {
  if (!isAllowedOrigin(request, config.allowedOrigins)) {
    return json(request, 403, { error: "Origine non autorisée." });
  }
  const headers = responseHeaders(request, config.allowedOrigins);
  headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  headers.set("Access-Control-Max-Age", "600");
  return new Response(null, { status: 204, headers });
}

export async function handleChatPost(
  request: Request,
  config: ChatConfig,
  generate: ChatGenerator,
): Promise<Response> {
  if (!isAllowedOrigin(request, config.allowedOrigins)) {
    return json(request, 403, { error: "Origine non autorisée." });
  }

  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    return json(request, 503, { error: "Le service de discussion est indisponible." }, config.allowedOrigins);
  }
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") ?? "")) {
    return json(request, 415, { error: "Envoyez des données JSON." }, config.allowedOrigins);
  }

  let body: string | null;
  try {
    body = await readLimitedBody(request);
  } catch {
    return json(request, 400, { error: "La requête est illisible." }, config.allowedOrigins);
  }
  if (body === null) {
    return json(request, 413, { error: "Le message est trop volumineux." }, config.allowedOrigins);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return json(request, 400, { error: "Le JSON envoyé est invalide." }, config.allowedOrigins);
  }
  const messages = validateMessages(payload);
  if (!messages) {
    return json(request, 400, { error: "La conversation envoyée est invalide." }, config.allowedOrigins);
  }

  const session = await agrixAccess(request);
  if (session && session.status !== 200) return json(request, session.status, { error: session.error }, config.allowedOrigins);
  const accessToken = config.accessToken?.trim();
  if (!session?.identity && (process.env.NODE_ENV === "production" || !accessToken || !authorized(request, accessToken))) {
    return json(request, 401, { error: "Accès à la discussion non autorisé." }, config.allowedOrigins);
  }
  const userId = session?.identity?.userId ?? createHash("sha256").update(accessToken ?? "").digest("hex");

  const requestsPerMinute = boundedInteger(config.requestsPerMinute, 10, 1, 120);
  const retryAfter = reserveRequest(userId, requestsPerMinute);
  if (retryAfter !== null) {
    const response = json(request, 429, { error: "Trop de messages envoyés. Réessayez dans une minute." }, config.allowedOrigins);
    response.headers.set("Retry-After", String(retryAfter));
    return response;
  }

  const agrix = session?.identity ? await agrixAccess(request, "chat") : null;
  if (agrix && agrix.status !== 200) return json(request, agrix.status, { error: agrix.error }, config.allowedOrigins);

  const startedAt = Date.now();
  let providerResponse: unknown;
  const finish = async (status: "succeeded" | "failed", failureCode?: string) => {
    if (!agrix?.usageEventId) return;
    const completed = await completeAgrixUsage(request, agrix.usageEventId, status, {
      response: providerResponse, durationMs: Date.now() - startedAt, failureCode,
    });
    if (!completed) console.error("[GX_CHAT_USAGE] Could not complete Agrix usage event");
  };

  let result;
  try { result = await runTurn({
    identity: { userId },
    conversationId: "private-session",
    messages,
    signal: request.signal,
    instructions: "Tu es GX.ai. Réponds avec clarté et précision dans la langue de l’utilisateur. N’affirme aucune action externe sans résultat vérifié.",
  }, {
    gateway: {
      generate: async (modelRequest, signal) => {
        const response = await generate({
          model: gxProviderModel(config.provider ?? "openai", agrix?.identity?.model ?? config.model),
          instructions: modelRequest.instructions,
          input: [...modelRequest.messages],
          store: false,
          max_output_tokens: boundedInteger(config.maxOutputTokens, 4_096, 256, 4_096),
        }, apiKey, signal);
        providerResponse = response;
        return { outputText: response.output_text ?? "" };
      },
    },
  }); } catch {
    await finish("failed", "provider_error");
    return json(request, 502, { error: "GX.ai ne répond pas pour le moment. Réessayez." }, config.allowedOrigins);
  }
  if (result.state === "CANCELLED") {
    await finish("failed", "cancelled");
    return json(request, 499, { error: "Génération arrêtée." }, config.allowedOrigins);
  }
  if (result.state === "FAILED") {
    await finish("failed", result.errorCode || "generation_failed");
    return json(request, 502, { error: result.errorCode === "EMPTY_OUTPUT"
      ? "GX.ai n’a pas pu produire de réponse. Réessayez."
      : "GX.ai ne répond pas pour le moment. Réessayez." }, config.allowedOrigins);
  }
  await finish("succeeded");
  return json(request, 200, { reply: result.reply }, config.allowedOrigins);
}
