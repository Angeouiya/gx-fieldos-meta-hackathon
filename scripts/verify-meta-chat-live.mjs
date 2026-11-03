import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createServer } from "node:net";
import console from "node:console";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const web = resolve(root, "apps/web");
const localEnv = resolve(web, ".env.local");
if (existsSync(localEnv)) process.loadEnvFile(localEnv);

if (!process.env.MODEL_API_KEY?.trim()) {
  console.error("MODEL_API_KEY absent : essai Meta indisponible.");
  process.exit(1);
}

const port = await new Promise((resolvePort, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (!address || typeof address === "string") return reject(new Error("Port local indisponible."));
    server.close(() => resolvePort(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const accessToken = randomBytes(32).toString("hex");
const server = spawn(process.execPath, [resolve(web, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: web,
  env: {
    PATH: process.env.PATH,
    Path: process.env.Path,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    APPDATA: process.env.APPDATA,
    LOCALAPPDATA: process.env.LOCALAPPDATA,
    USERPROFILE: process.env.USERPROFILE,
    NODE_ENV: "development",
    GX_MODEL_PROVIDER: "meta",
    GX_META_MODEL: "muse-spark-1.3",
    MODEL_API_KEY: process.env.MODEL_API_KEY,
    GX_CHAT_ACCESS_TOKEN: accessToken,
  },
  stdio: "ignore",
  windowsHide: true,
});

try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (server.exitCode !== null) throw new Error("Le serveur GX s'est arrêté avant le test.");
    try {
      const response = await globalThis.fetch(origin, { signal: globalThis.AbortSignal.timeout(2_000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Next.js démarre encore. */ }
    await delay(1_000);
  }
  if (!ready) throw new Error("Le serveur GX n'a pas démarré en une minute.");

  const response = await globalThis.fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messages: [{ role: "user", content: "Réponds en un mot pour confirmer que GX fonctionne." }] }),
    signal: globalThis.AbortSignal.timeout(90_000),
  });
  const body = await response.json();
  if (!response.ok || typeof body.reply !== "string" || !body.reply.trim()) {
    throw new Error(`La route GX /api/chat a répondu HTTP ${response.status} sans réponse Meta valide.`);
  }
  console.log(`GX Web → Meta Model API : HTTP ${response.status}, réponse non vide (${body.reply.length} caractères).`);
} finally {
  server.kill();
}
