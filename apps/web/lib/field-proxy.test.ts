import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedFieldPath, proxyFieldRequest, resolveFieldAgrixOrigin } from "./field-proxy.ts";

test("Field proxy accepts only a loopback origin during local development", () => {
  assert.equal(resolveFieldAgrixOrigin("http://127.0.0.1:3001", "development"), "http://127.0.0.1:3001");
  assert.equal(resolveFieldAgrixOrigin("http://localhost:3001/", "development"), "http://localhost:3001");
  for (const value of ["https://agrix.example", "http://internal.example", "http://127.0.0.1:3001/api",
    "http://user:pass@127.0.0.1:3001", "http://127.0.0.1:3001?x=1", "not-a-url"]) {
    assert.equal(resolveFieldAgrixOrigin(value, "development"), "https://agrix.africa");
  }
  assert.equal(resolveFieldAgrixOrigin("http://127.0.0.1:3001", "production"), "https://agrix.africa");
});

test("Field proxy forwards a local development request to isolated AGRIX with its own origin", async () => {
  const priorMode = process.env.NODE_ENV;
  const priorOrigin = process.env.GX_AGRIX_DEV_ORIGIN;
  let received: { url: string; origin: string } | undefined;
  try {
    Reflect.set(process.env, "NODE_ENV", "development");
    process.env.GX_AGRIX_DEV_ORIGIN = "http://127.0.0.1:3001";
    const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
      received = { url: String(url), origin: String((init?.headers as Record<string, string>).Origin) };
      return Response.json({ project: { id: "p1" } }, { status: 201 });
    }) as typeof fetch;
    const response = await proxyFieldRequest(new Request("http://127.0.0.1:3000/api/field/projects", {
      method: "POST", headers: { cookie: "agrix_user_token=test", origin: "http://127.0.0.1:3000" }, body: "{}",
    }), ["projects"], fetcher);
    assert.equal(response.status, 201);
    assert.deepEqual(received, { url: "http://127.0.0.1:3001/api/gx/projects", origin: "http://127.0.0.1:3001" });
  } finally {
    if (priorMode === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Reflect.set(process.env, "NODE_ENV", priorMode);
    if (priorOrigin === undefined) delete process.env.GX_AGRIX_DEV_ORIGIN; else process.env.GX_AGRIX_DEV_ORIGIN = priorOrigin;
  }
});

test("Field proxy exposes only the project workflow and rejects path traversal", () => {
  assert.equal(allowedFieldPath(["field-missions", "scan-1"], "PATCH"), "/api/gx/field-missions/scan-1");
  assert.equal(allowedFieldPath(["field-missions", "scan-1"], "DELETE"), null);
  assert.equal(allowedFieldPath(["projects", "project-1", "plans"], "POST"), "/api/gx/projects/project-1/plans");
  assert.equal(allowedFieldPath(["projects", "../access"], "GET"), null);
  assert.equal(allowedFieldPath(["admin", "users"], "GET"), null);
  assert.equal(allowedFieldPath(["projects", "project-1", "members"], "POST"), "/api/gx/projects/project-1/members");
  assert.equal(allowedFieldPath(["projects", "project-1", "members"], "DELETE"), "/api/gx/projects/project-1/members");
  assert.equal(allowedFieldPath(["projects", "project-1", "members"], "GET"), null);
  assert.equal(allowedFieldPath(["projects", "project-1", "technical-guide"], "GET"), "/api/gx/projects/project-1/technical-guide");
  assert.equal(allowedFieldPath(["conversations"], "PUT"), "/api/gx/conversations");
  assert.equal(allowedFieldPath(["conversations", "another-user"], "GET"), null);
  assert.equal(allowedFieldPath(["projects", "project-1", "farm"], "POST"), "/api/gx/projects/project-1/farm");
  assert.equal(allowedFieldPath(["projects", "project-1", "farm"], "DELETE"), "/api/gx/projects/project-1/farm");
  assert.equal(allowedFieldPath(["projects", "project-1", "farm", "export"], "GET"), "/api/gx/projects/project-1/farm/export");
  assert.equal(allowedFieldPath(["projects", "project-1", "farm", "export"], "POST"), null);
});

test("Scan rename forwards only to the selected mission with the AGRIX session", async () => {
  let received: { url: string; method: string; body: string; cookie: string } | undefined;
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    received = { url: String(url), method: String(init?.method), body: new TextDecoder().decode(init?.body as ArrayBuffer),
      cookie: String((init?.headers as Record<string, string>).Cookie) };
    return Response.json({ mission: { id: "scan-1", title: "01 - Site overview", status: "ready" } });
  }) as typeof fetch;
  const body = JSON.stringify({ expectedVersion: 3, title: "01 - Site overview" });
  const response = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/field-missions/scan-1", {
    method: "PATCH", headers: { cookie: "agrix_user_token=private", origin: "https://gx.agrix.africa" }, body,
  }), ["field-missions", "scan-1"], fetcher);
  assert.equal(response.status, 200);
  assert.deepEqual(received, { url: "https://agrix.africa/api/gx/field-missions/scan-1", method: "PATCH", body,
    cookie: "agrix_user_token=private" });
});

test("Technical guide forwards a validated format and blocks extra query parameters", async () => {
  let target = "";
  const fetcher = (async (url: string | URL | Request) => { target = String(url); return new Response("pdf", { headers: { "content-type": "application/pdf" } }); }) as typeof fetch;
  const cookie = "agrix_user_token=private";
  const valid = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/technical-guide?format=pdf&lang=fr", { headers: { cookie } }),
    ["projects", "p1", "technical-guide"], fetcher);
  assert.equal(valid.status, 200);
  assert.equal(target, "https://agrix.africa/api/gx/projects/p1/technical-guide?format=pdf&lang=fr");
  const invalid = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/technical-guide?format=pdf&user=other", { headers: { cookie } }),
    ["projects", "p1", "technical-guide"], fetcher);
  assert.equal(invalid.status, 400);
});

test("Farm export forwards only a supported format with the AGRIX session", async () => {
  let target = "";
  const fetcher = (async (url: string | URL | Request) => { target = String(url); return new Response("xlsx", { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": "attachment; filename=plan.xlsx" } }); }) as typeof fetch;
  const cookie = "agrix_user_token=private";
  const valid = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/farm/export?format=xlsx", { headers: { cookie } }),
    ["projects", "p1", "farm", "export"], fetcher);
  assert.equal(valid.status, 200);
  assert.equal(target, "https://agrix.africa/api/gx/projects/p1/farm/export?format=xlsx");
  assert.equal(valid.headers.get("content-disposition"), "attachment; filename=plan.xlsx");
  const pdf = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/farm/export?format=pdf&lang=en", { headers: { cookie } }),
    ["projects", "p1", "farm", "export"], fetcher);
  assert.equal(pdf.status, 200);
  assert.equal(target, "https://agrix.africa/api/gx/projects/p1/farm/export?format=pdf&lang=en");
  const french = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/farm/export?format=docx&lang=fr", { headers: { cookie } }),
    ["projects", "p1", "farm", "export"], fetcher);
  assert.equal(french.status, 200);
  assert.equal(target, "https://agrix.africa/api/gx/projects/p1/farm/export?format=docx&lang=fr");
  const invalid = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects/p1/farm/export?format=exe", { headers: { cookie } }),
    ["projects", "p1", "farm", "export"], fetcher);
  assert.equal(invalid.status, 400);
});

test("Conversation proxy preserves only a validated id and never clears all conversations", async () => {
  let target = "";
  const fetcher = (async (url: string | URL | Request) => {
    target = String(url);
    return Response.json({ conversation: { id: "local-12345678" } });
  }) as typeof fetch;
  const cookie = "agrix_user_token=private";
  const selected = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/conversations?id=local-12345678", {
    headers: { cookie },
  }), ["conversations"], fetcher);
  assert.equal(selected.status, 200);
  assert.equal(target, "https://agrix.africa/api/gx/conversations?id=local-12345678");
  const invalid = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/conversations?id=", {
    method: "DELETE", headers: { cookie, origin: "https://gx.agrix.africa" },
  }), ["conversations"], fetcher);
  assert.equal(invalid.status, 400);
  const all = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/conversations", {
    method: "DELETE", headers: { cookie, origin: "https://gx.agrix.africa" },
  }), ["conversations"], fetcher);
  assert.equal(all.status, 400);
});

test("Field proxy requires an AGRIX session and same origin before forwarding", async () => {
  let calls = 0;
  const fetcher = (async () => { calls += 1; return Response.json({ projects: [] }); }) as typeof fetch;
  const unsigned = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects"), ["projects"], fetcher);
  assert.equal(unsigned.status, 401);
  const crossed = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects", {
    method: "POST", headers: { cookie: "agrix_user_token=test", origin: "https://evil.example" }, body: "{}",
  }), ["projects"], fetcher);
  assert.equal(crossed.status, 403);
  assert.equal(calls, 0);
});

test("Field proxy forwards only the authenticated workflow to AGRIX", async () => {
  let received: { url: string; cookie: string; origin: string; body: string } | undefined;
  const fetcher = (async (url: string | URL | Request, init?: RequestInit) => {
    received = { url: String(url), cookie: String((init?.headers as Record<string, string>).Cookie),
      origin: String((init?.headers as Record<string, string>).Origin), body: new TextDecoder().decode(init?.body as ArrayBuffer) };
    return Response.json({ project: { id: "p1" } }, { status: 201 });
  }) as typeof fetch;
  const response = await proxyFieldRequest(new Request("https://gx.agrix.africa/api/field/projects", {
    method: "POST", headers: { cookie: "agrix_user_token=private", origin: "https://gx.agrix.africa" },
    body: JSON.stringify({ title: "North field" }),
  }), ["projects"], fetcher);
  assert.equal(response.status, 201);
  assert.deepEqual(received, { url: "https://agrix.africa/api/gx/projects", cookie: "agrix_user_token=private",
    origin: "https://agrix.africa", body: '{"title":"North field"}' });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});
