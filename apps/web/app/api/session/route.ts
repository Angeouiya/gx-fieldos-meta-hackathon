import { agrixAccess } from "../../../lib/agrix-access.ts";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await agrixAccess(request);
  const headers = { "Cache-Control": "no-store" };
  if (!access) return Response.json({ authenticated: false, mode: "local-development", error: "Connexion Agrix non configurée." }, { status: process.env.NODE_ENV === "production" ? 503 : 200, headers });
  if (access.status !== 200) return Response.json({ authenticated: false, mode: "agrix", error: access.error }, { status: access.status, headers });
  return Response.json({ authenticated: true, mode: "agrix", planId: access.identity?.planId }, { status: 200, headers });
}
