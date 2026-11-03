import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route.ts";

test("invalid audio does not reserve an Agrix transcription", async () => {
  const priorFetch = globalThis.fetch;
  const priorAccessUrl = process.env.GX_AGRIX_ACCESS_URL;
  const priorSecret = process.env.GX_SERVICE_SECRET;
  const priorApiKey = process.env.OPENAI_API_KEY;
  const methods: string[] = [];
  try {
    process.env.GX_AGRIX_ACCESS_URL = "https://agrix.africa/api/gx/access";
    process.env.GX_SERVICE_SECRET = "s".repeat(48);
    process.env.OPENAI_API_KEY = "test-key";
    globalThis.fetch = async (_input, init) => {
      methods.push(init?.method ?? "GET");
      return Response.json({ userId: "agrix-user", plan: { id: "decouverte", model: "gpt-6-luna", images: false } });
    };
    const form = new FormData();
    form.append("audio", new File(["not an audio file".repeat(10)], "notes.txt", { type: "text/plain" }));
    const response = await POST(new Request("https://gx.agrix.africa/api/transcribe", {
      method: "POST", headers: { Cookie: "agrix_user_token=signed-session" }, body: form,
    }));
    assert.equal(response.status, 400);
    assert.deepEqual(methods, ["GET"]);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorAccessUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = priorAccessUrl;
    if (priorSecret === undefined) delete process.env.GX_SERVICE_SECRET; else process.env.GX_SERVICE_SECRET = priorSecret;
    if (priorApiKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = priorApiKey;
  }
});
