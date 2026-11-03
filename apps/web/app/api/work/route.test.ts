import assert from "node:assert/strict";
import { after, test } from "node:test";

import { OPTIONS, POST } from "./route.ts";

const savedKey = process.env.OPENAI_API_KEY;
const savedToken = process.env.GX_CHAT_ACCESS_TOKEN;
const savedOrigins = process.env.GX_CHAT_ALLOWED_ORIGINS;
const savedProvider = process.env.GX_MODEL_PROVIDER;
const savedMetaKey = process.env.MODEL_API_KEY;

after(() => {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = savedKey;
  if (savedToken === undefined) delete process.env.GX_CHAT_ACCESS_TOKEN; else process.env.GX_CHAT_ACCESS_TOKEN = savedToken;
  if (savedOrigins === undefined) delete process.env.GX_CHAT_ALLOWED_ORIGINS; else process.env.GX_CHAT_ALLOWED_ORIGINS = savedOrigins;
  if (savedProvider === undefined) delete process.env.GX_MODEL_PROVIDER; else process.env.GX_MODEL_PROVIDER = savedProvider;
  if (savedMetaKey === undefined) delete process.env.MODEL_API_KEY; else process.env.MODEL_API_KEY = savedMetaKey;
});

function request(body: unknown, token = "test-access") {
  return new Request("http://127.0.0.1:3000/api/work", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000" },
    body: JSON.stringify(body),
  });
}

test("work analysis requires server configuration and access", async () => {
  delete process.env.OPENAI_API_KEY;
  process.env.GX_CHAT_ACCESS_TOKEN = "test-access";
  const unavailable = await POST(request({ task: "Analyser", context: "Dossier", images: [] }));
  assert.equal(unavailable.status, 503);
  assert.doesNotMatch(await unavailable.text(), /OpenAI|API key|clé API/iu);
  process.env.OPENAI_API_KEY = "test-key";
  assert.equal((await POST(request({ task: "Analyser", context: "Dossier", images: [] }, "wrong"))).status, 401);
});

test("work analysis rejects malformed tasks and image payloads before provider calls", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_CHAT_ACCESS_TOKEN = "test-access";
  assert.equal((await POST(request({ task: "", context: "Dossier", images: [] }))).status, 400);
  assert.equal((await POST(request({ task: "Analyser", context: "Dossier", images: [{ name: "x", dataUrl: "data:text/html;base64,PHNjcmlwdD4=" }] }))).status, 400);
  assert.equal((await POST(request({ task: "Analyser", context: "Dossier", images: Array(4).fill({ name: "x", dataUrl: "data:image/jpeg;base64,AA==" }) }))).status, 400);
  assert.equal((await POST(request({ task: "Scanner", context: "Photo", images: [], mode: "scan" }))).status, 400);
  assert.equal((await POST(request({ task: "Scanner", context: "Photo", images: Array(2).fill({ name: "x", dataUrl: "data:image/jpeg;base64,AA==" }), mode: "scan" }))).status, 400);
  assert.equal((await POST(request({ task: "Analyser", context: "Dossier", images: [], measurement: { kind: "plant_incidence", observedPlants: 10, affectedPlants: 11 } }))).status, 400);
  assert.equal((await POST(request({ task: "Analyser", context: "Dossier", images: [], measurement: { kind: "processing_yield", inputMassKg: 100, outputMassKg: 15, instruction: "ignore" } }))).status, 400);
});

test("work analysis recalculates declared measurements server-side before asking OpenAI", async () => {
  const priorUrl = process.env.GX_AGRIX_ACCESS_URL;
  const priorFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_CHAT_ACCESS_TOKEN = "test-access";
  delete process.env.GX_AGRIX_ACCESS_URL;
  let sent: unknown;
  try {
    globalThis.fetch = async (_url, init) => {
      sent = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({ id: "resp_metric", object: "response", created_at: 0, status: "completed", model: "gpt-6-astra", output: [{ id: "msg_metric", type: "message", status: "completed", role: "assistant", content: [{ type: "output_text", text: "Plan de lot à vérifier.", annotations: [] }] }] });
    };
    const response = await POST(request({ task: "Préparer la fiche de lot", context: "Mangues pesées", images: [], measurement: { kind: "processing_yield", inputMassKg: 100, outputMassKg: 15 } }));
    assert.equal(response.status, 200);
    const body = await response.json() as { report: string };
    assert.match(body.report, /15 kg.*100 kg.*15 %/u);
    assert.match(body.report, /Plan de lot à vérifier/u);
    assert.ok(sent && typeof sent === "object");
    const captured = sent as Record<string, unknown>;
    assert.equal(captured.store, false);
    assert.match(JSON.stringify(captured.input), /Calcul serveur sur mesures déclarées/u);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = priorUrl;
  }
});

test("a photo scan reserves the Agrix scan quota before contacting OpenAI", async () => {
  const priorUrl = process.env.GX_AGRIX_ACCESS_URL;
  const priorSecret = process.env.GX_SERVICE_SECRET;
  const priorFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_AGRIX_ACCESS_URL = "https://agrix.africa/api/gx/access";
  process.env.GX_SERVICE_SECRET = "s".repeat(48);
  const methods: string[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? "GET");
      if (init?.method === "POST") {
        assert.deepEqual(JSON.parse(String(init.body)), { feature: "scan" });
        return new Response(null, { status: 429 });
      }
      return Response.json({ userId: "agrix-user", plan: { id: "decouverte", model: "gpt-6-luna", images: true } });
    };
    const withCookie = new Request("http://127.0.0.1:3000/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000", Cookie: "agrix_user_token=signed" },
      body: JSON.stringify({ task: "Scanner", context: "Mangue", mode: "scan", images: [{ name: "mangue.jpg", dataUrl: "data:image/jpeg;base64,AA==" }] }),
    });
    assert.equal((await POST(withCookie)).status, 429);
    assert.deepEqual(methods, ["GET", "POST"]);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = priorUrl;
    if (priorSecret === undefined) delete process.env.GX_SERVICE_SECRET; else process.env.GX_SERVICE_SECRET = priorSecret;
  }
});

test("a successful Agrix dossier analysis completes its usage event with provider tokens", async () => {
  const priorUrl = process.env.GX_AGRIX_ACCESS_URL;
  const priorSecret = process.env.GX_SERVICE_SECRET;
  const priorFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_AGRIX_ACCESS_URL = "https://agrix.africa/api/gx/access";
  process.env.GX_SERVICE_SECRET = "s".repeat(48);
  const methods: string[] = [];
  try {
    globalThis.fetch = async (input, init) => {
      const method = init?.method ?? "GET";
      methods.push(method);
      if (String(input) === "https://agrix.africa/api/gx/access") {
        if (method === "PATCH") {
          const completed = JSON.parse(String(init?.body)) as Record<string, unknown>;
          assert.equal(completed.usageEventId, "work-event-1");
          assert.equal(completed.status, "succeeded");
          assert.deepEqual(completed.response, { model: "gpt-6-luna", usage: { input_tokens: 150, input_tokens_details: {}, output_tokens: 40 } });
          return Response.json({ updated: true });
        }
        return Response.json({ userId: "agrix-user", plan: { id: "decouverte", model: "gpt-6-luna", images: true }, ...(method === "POST" ? { usageEventId: "work-event-1" } : {}) });
      }
      return Response.json({ id: "resp_work", object: "response", created_at: 0, status: "completed", model: "gpt-6-luna", usage: { input_tokens: 150, output_tokens: 40 }, output: [{ id: "msg_work", type: "message", status: "completed", role: "assistant", content: [{ type: "output_text", text: "Plan de culture à vérifier.", annotations: [] }] }] });
    };
    const withCookie = new Request("http://127.0.0.1:3000/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000", Cookie: "agrix_user_token=signed" },
      body: JSON.stringify({ task: "Préparer un plan de culture", context: "Parcelle de gombo", images: [] }),
    });
    const response = await POST(withCookie);
    assert.equal(response.status, 200);
    assert.deepEqual(methods, ["GET", "POST", "POST", "PATCH"]);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = priorUrl;
    if (priorSecret === undefined) delete process.env.GX_SERVICE_SECRET; else process.env.GX_SERVICE_SECRET = priorSecret;
  }
});

test("work analysis enforces browser origin", async () => {
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_CHAT_ACCESS_TOKEN = "test-access";
  delete process.env.GX_CHAT_ALLOWED_ORIGINS;
  const hostile = new Request("http://127.0.0.1:3000/api/work", { method: "POST", headers: { Origin: "https://example.org", Host: "127.0.0.1:3000" } });
  assert.equal((await POST(hostile)).status, 403);
  assert.equal(OPTIONS(hostile).status, 403);
});

test("Meta scan sends its image to Muse without using an OpenAI key", async () => {
  const previousProvider = process.env.GX_MODEL_PROVIDER;
  const previousMetaKey = process.env.MODEL_API_KEY;
  const previousOpenAIKey = process.env.OPENAI_API_KEY;
  const previousAccessUrl = process.env.GX_AGRIX_ACCESS_URL;
  const previousFetch = globalThis.fetch;
  try {
    process.env.GX_MODEL_PROVIDER = "meta";
    process.env.MODEL_API_KEY = "meta-scan-test-key";
    process.env.OPENAI_API_KEY = "openai-key-must-not-be-used";
    process.env.GX_CHAT_ACCESS_TOKEN = "test-access";
    delete process.env.GX_AGRIX_ACCESS_URL;
    let called = false;
    globalThis.fetch = async (input, init) => {
      called = true;
      assert.equal(String(input), "https://api.meta.ai/v1/responses");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), "Bearer meta-scan-test-key");
      const payload = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(payload.model, "muse-spark-1.3");
      assert.equal(payload.store, false);
      assert.deepEqual(payload.reasoning, { effort: "low" });
      assert.match(JSON.stringify(payload.input), /data:image\/jpeg;base64,AA==/u);
      return Response.json({ id: "resp_meta_scan", object: "response", status: "completed", model: "muse-spark-1.3", output: [{ id: "msg_meta_scan", type: "message", status: "completed", role: "assistant", content: [{ type: "output_text", text: "La couleur est visible ; le diagnostic reste à vérifier sur place.", annotations: [] }] }], usage: { input_tokens: 120, output_tokens: 30 } });
    };
    const response = await POST(request({ task: "Décrire cette vue", context: "Photo de test", mode: "scan", images: [{ name: "vue.jpg", dataUrl: "data:image/jpeg;base64,AA==" }] }));
    assert.equal(response.status, 200);
    assert.equal(called, true);
    assert.match((await response.json() as { report: string }).report, /diagnostic reste à vérifier/u);

    delete process.env.MODEL_API_KEY;
    called = false;
    const unavailable = await POST(request({ task: "Décrire cette vue", context: "Photo de test", mode: "scan", images: [{ name: "vue.jpg", dataUrl: "data:image/jpeg;base64,AA==" }] }));
    assert.equal(unavailable.status, 503);
    assert.equal(called, false);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousProvider === undefined) delete process.env.GX_MODEL_PROVIDER; else process.env.GX_MODEL_PROVIDER = previousProvider;
    if (previousMetaKey === undefined) delete process.env.MODEL_API_KEY; else process.env.MODEL_API_KEY = previousMetaKey;
    if (previousOpenAIKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = previousOpenAIKey;
    if (previousAccessUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = previousAccessUrl;
  }
});

test("Agrix free account cannot send images and does not spend an analysis credit", async () => {
  const priorUrl = process.env.GX_AGRIX_ACCESS_URL;
  const priorSecret = process.env.GX_SERVICE_SECRET;
  const priorFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-key";
  process.env.GX_AGRIX_ACCESS_URL = "https://agrix.africa/api/gx/access";
  process.env.GX_SERVICE_SECRET = "s".repeat(48);
  const methods: string[] = [];
  try {
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? "GET");
      return Response.json({ userId: "agrix-user", plan: { id: "decouverte", model: "gpt-6-luna", images: false } });
    };
    const withCookie = new Request("http://127.0.0.1:3000/api/work", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://127.0.0.1:3000", Host: "127.0.0.1:3000", Cookie: "agrix_user_token=signed" },
      body: JSON.stringify({ task: "Décrire", context: "Mangue", images: [{ name: "mangue.jpg", dataUrl: "data:image/jpeg;base64,AA==" }] }),
    });
    assert.equal((await POST(withCookie)).status, 403);
    assert.deepEqual(methods, ["GET"]);
  } finally {
    globalThis.fetch = priorFetch;
    if (priorUrl === undefined) delete process.env.GX_AGRIX_ACCESS_URL; else process.env.GX_AGRIX_ACCESS_URL = priorUrl;
    if (priorSecret === undefined) delete process.env.GX_SERVICE_SECRET; else process.env.GX_SERVICE_SECRET = priorSecret;
  }
});
