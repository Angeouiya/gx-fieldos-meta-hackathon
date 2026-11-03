import OpenAI from "openai";

import { handleChatOptions, handleChatPost, type ChatConfig } from "./handler.ts";
import { gxModelProvider, gxProviderBaseUrl, gxProviderKey } from "../../../lib/model-provider.ts";

export const runtime = "nodejs";

function config(): ChatConfig {
  const provider = gxModelProvider(process.env.GX_MODEL_PROVIDER);
  return {
    apiKey: provider ? gxProviderKey(provider) : undefined,
    provider: provider ?? undefined,
    accessToken: process.env.GX_CHAT_ACCESS_TOKEN,
    model: provider === "meta" ? process.env.GX_META_MODEL : process.env.GX_OPENAI_MODEL,
    allowedOrigins: process.env.GX_CHAT_ALLOWED_ORIGINS,
    requestsPerMinute: process.env.GX_CHAT_REQUESTS_PER_MINUTE,
    maxOutputTokens: process.env.GX_CHAT_MAX_OUTPUT_TOKENS,
  };
}

export function OPTIONS(request: Request): Response {
  return handleChatOptions(request, config());
}

export async function POST(request: Request): Promise<Response> {
  const settings = config();
  return handleChatPost(request, settings, async (params, apiKey, signal) => {
    const client = new OpenAI({ apiKey, baseURL: gxProviderBaseUrl(settings.provider ?? "openai"), timeout: 60_000, maxRetries: 0 });
    return client.responses.create(params, { signal });
  });
}
