import assert from "node:assert/strict";
import test from "node:test";

import { POST } from "./route.ts";

const keys = ["GX_MODEL_PROVIDER", "MODEL_API_KEY", "OPENAI_API_KEY", "GX_CHAT_ACCESS_TOKEN", "GX_META_MODEL", "GX_AGRIX_ACCESS_URL", "GX_SERVICE_SECRET"] as const;

test("the live route calls Meta Responses with only the Meta key", async () => {
  const prior = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const priorFetch = globalThis.fetch;
  try {
    process.env.GX_MODEL_PROVIDER = "meta";
    process.env.MODEL_API_KEY = "meta-route-test-key";
    process.env.OPENAI_API_KEY = "openai-route-test-key";
    process.env.GX_CHAT_ACCESS_TOKEN = "route-test-token";
    process.env.GX_META_MODEL = "muse-spark-1.3";
    delete process.env.GX_AGRIX_ACCESS_URL;
    delete process.env.GX_SERVICE_SECRET;
    let called = false;
    let unexpectedUrl = "";
    globalThis.fetch = async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== "https://api.meta.ai/v1/responses") { unexpectedUrl = url; throw new Error("Unexpected provider URL"); }
      const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
      assert.equal(headers.get("authorization"), "Bearer meta-route-test-key");
      const rawBody = init?.body ?? (input instanceof Request ? await input.clone().text() : undefined);
      const body = JSON.parse(String(rawBody)) as Record<string, unknown>;
      assert.equal(body.model, "muse-spark-1.3");
      assert.equal(body.store, false);
      called = true;
      return Response.json({ id: "resp_test", object: "response", status: "completed", model: "muse-spark-1.3", output: [{ id: "msg_test", type: "message", status: "completed", role: "assistant", content: [{ type: "output_text", text: "Meta route works", annotations: [] }] }], usage: { input_tokens: 8, output_tokens: 3, total_tokens: 11 } });
    };
    const response = await POST(new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer route-test-token" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Bonjour" }] }),
    }));
    assert.equal(unexpectedUrl, "");
    assert.equal(called, true);
    const result = await response.json();
    assert.equal(response.status, 200, JSON.stringify(result));
    assert.deepEqual(result, { reply: "Meta route works" });
  } finally {
    globalThis.fetch = priorFetch;
    for (const key of keys) {
      if (prior[key] === undefined) delete process.env[key]; else process.env[key] = prior[key];
    }
  }
});

test("a missing Meta key never falls back to the OpenAI key", async () => {
  const priorProvider = process.env.GX_MODEL_PROVIDER;
  const priorMetaKey = process.env.MODEL_API_KEY;
  const priorOpenAiKey = process.env.OPENAI_API_KEY;
  try {
    process.env.GX_MODEL_PROVIDER = "meta";
    delete process.env.MODEL_API_KEY;
    process.env.OPENAI_API_KEY = "must-not-be-used";
    const response = await POST(new Request("http://localhost:3000/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "Bonjour" }] }),
    }));
    assert.equal(response.status, 503);
  } finally {
    if (priorProvider === undefined) delete process.env.GX_MODEL_PROVIDER; else process.env.GX_MODEL_PROVIDER = priorProvider;
    if (priorMetaKey === undefined) delete process.env.MODEL_API_KEY; else process.env.MODEL_API_KEY = priorMetaKey;
    if (priorOpenAiKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = priorOpenAiKey;
  }
});
