const AGRIX_ORIGIN = "https://agrix.africa";
const ID = /^[a-zA-Z0-9_-]{1,100}$/;

export function resolveFieldAgrixOrigin(value = process.env.GX_AGRIX_DEV_ORIGIN, environment = process.env.NODE_ENV): string {
  if (environment !== "development" || !value) return AGRIX_ORIGIN;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return AGRIX_ORIGIN;
    return url.origin;
  } catch {
    return AGRIX_ORIGIN;
  }
}

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export function allowedFieldPath(segments: string[], method: Method): string | null {
  if (!segments.every((part) => ID.test(part))) return null;
  const [root, projectId, action, child] = segments;
  if (root === "conversations" && segments.length === 1 && ["GET", "PUT", "PATCH", "DELETE"].includes(method)) {
    return "/api/gx/conversations";
  }
  if (root === "projects") {
    if (segments.length === 1 && ["GET", "POST"].includes(method)) return "/api/gx/projects";
    if (!projectId) return null;
    if (segments.length === 2 && ["GET", "PATCH"].includes(method)) return `/api/gx/projects/${projectId}`;
    if (segments.length === 3 && method === "POST" && ["scans", "measurements", "plans", "tasks", "documents", "farm"].includes(action!)) {
      return `/api/gx/projects/${projectId}/${action}`;
    }
    if (segments.length === 3 && method === "PATCH" && ["plans", "tasks", "farm"].includes(action!)) {
      return `/api/gx/projects/${projectId}/${action}`;
    }
    if (segments.length === 3 && method === "GET" && action === "export") return `/api/gx/projects/${projectId}/export`;
    if (segments.length === 3 && ["POST", "DELETE"].includes(method) && action === "members") return `/api/gx/projects/${projectId}/members`;
    if (segments.length === 3 && method === "GET" && action === "technical-guide") return `/api/gx/projects/${projectId}/technical-guide`;
    if (segments.length === 3 && ["GET", "DELETE"].includes(method) && action === "farm") return `/api/gx/projects/${projectId}/farm`;
    if (segments.length === 4 && method === "GET" && action === "farm" && child === "export") return `/api/gx/projects/${projectId}/farm/export`;
  }
  if (root === "field-missions" && projectId) {
    if (segments.length === 2 && method === "PATCH") return `/api/gx/field-missions/${projectId}`;
    if (segments.length === 3 && method === "POST" && ["analyze", "evidence-upload", "evidence"].includes(action!)) {
      return `/api/gx/field-missions/${projectId}/${action}`;
    }
    if (segments.length === 4 && method === "GET" && action === "evidence" && child) {
      return `/api/gx/field-missions/${projectId}/evidence/${child}`;
    }
  }
  return null;
}

function json(status: number, error: string) {
  return Response.json({ error }, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function proxyFieldRequest(
  request: Request,
  segments: string[],
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const method = request.method as Method;
  if (!["GET", "POST", "PATCH", "PUT", "DELETE"].includes(method)) return json(405, "Méthode non autorisée.");
  const pathname = allowedFieldPath(segments, method);
  if (!pathname) return json(404, "Route introuvable.");
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && origin !== new URL(request.url).origin)) {
    return json(403, "Origine non autorisée.");
  }
  const cookie = request.headers.get("cookie") ?? "";
  if (!/(?:^|;\s*)agrix_user_token=/.test(cookie)) return json(401, "Connectez-vous à AGRIX.");
  const maxBytes = pathname === "/api/gx/conversations" ? 900_000 : 90_000;
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > maxBytes) return json(413, "Requête trop volumineuse.");

  let body: ArrayBuffer | undefined;
  if (method !== "GET") {
    body = await request.arrayBuffer();
    if (body.byteLength > maxBytes) return json(413, "Requête trop volumineuse.");
  }
  const agrixOrigin = resolveFieldAgrixOrigin();
  const target = new URL(pathname, agrixOrigin);
  if (pathname === "/api/gx/conversations") {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== "id") || params.getAll("id").length > 1) return json(400, "Paramètres invalides.");
    const id = params.get("id");
    if (id !== null && !/^[a-zA-Z0-9-]{8,80}$/.test(id)) return json(400, "Conversation invalide.");
    if (method === "DELETE" && id === null) return json(400, "Sélectionnez une conversation.");
    if (id !== null) target.searchParams.set("id", id);
  }
  if (method === "GET" && pathname.endsWith("/technical-guide")) {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => !["format", "lang"].includes(key)) || params.getAll("format").length !== 1
      || !["pdf", "docx"].includes(params.get("format") ?? "") || params.getAll("lang").length > 1
      || (params.has("lang") && !["fr", "en"].includes(params.get("lang") ?? ""))) return json(400, "Format de guide invalide.");
    target.searchParams.set("format", params.get("format")!);
    if (params.has("lang")) target.searchParams.set("lang", params.get("lang")!);
  } else if (method === "GET" && pathname.endsWith("/farm/export")) {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => !["format", "lang"].includes(key)) || params.getAll("format").length !== 1
      || !["xlsx", "docx", "pdf"].includes(params.get("format") ?? "")
      || params.getAll("lang").length > 1 || (params.has("lang") && !["fr", "en"].includes(params.get("lang") ?? ""))) return json(400, "Format d’export invalide.");
    target.searchParams.set("format", params.get("format")!);
    if (params.has("lang")) target.searchParams.set("lang", params.get("lang")!);
  } else if (method === "GET" && pathname.endsWith("/export")) target.search = "";
  try {
    const upstream = await fetcher(target, {
      method,
      headers: {
        Cookie: cookie,
        ...(method === "GET" ? {} : { Origin: agrixOrigin, "Content-Type": "application/json" }),
      },
      ...(body ? { body } : {}),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(pathname.endsWith("/analyze") || pathname.endsWith("/plans") ? 120_000 : 25_000),
    });
    if (upstream.status >= 300 && upstream.status < 400) return json(502, "Redirection AGRIX inattendue.");
    const headers = new Headers({ "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    for (const header of ["content-type", "content-disposition", "retry-after"]) {
      const value = upstream.headers.get(header);
      if (value) headers.set(header, value);
    }
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return json(503, "Service terrain AGRIX indisponible. Vos données existantes sont conservées.");
  }
}
