export type GXFeature = 'chat' | 'analysis' | 'scan' | 'transcription';

export interface AgrixIdentity {
  userId: string;
  planId: string;
  model: 'gpt-6-luna' | 'gpt-6.1-sol' | 'gpt-6-astra';
  images: boolean;
}

export interface AgrixAccessResult {
  status: number;
  identity?: AgrixIdentity;
  usageEventId?: string;
  error?: string;
}

export type AgrixUsageStatus = "succeeded" | "failed";

function usageEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const response = value as Record<string, unknown>;
  const usage = response.usage && typeof response.usage === "object" && !Array.isArray(response.usage)
    ? response.usage as Record<string, unknown> : null;
  const inputDetails = usage?.input_tokens_details && typeof usage.input_tokens_details === "object" && !Array.isArray(usage.input_tokens_details)
    ? usage.input_tokens_details as Record<string, unknown> : null;
  const tokens = (number: unknown) => typeof number === "number" && Number.isSafeInteger(number) && number >= 0 ? number : undefined;
  return {
    ...(typeof response.model === "string" ? { model: response.model.slice(0, 80) } : {}),
    ...(usage ? { usage: {
      input_tokens: tokens(usage.input_tokens),
      input_tokens_details: { cached_tokens: tokens(inputDetails?.cached_tokens) },
      output_tokens: tokens(usage.output_tokens),
    } } : {}),
  };
}

function accessUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value);
    if (url.pathname !== '/api/gx/access' || url.search || url.hash) return null;
    if (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) return url.toString();
  } catch { /* Invalid configuration. */ }
  return null;
}

export async function agrixAccess(
  request: Request,
  feature?: GXFeature,
  options: { url?: string; secret?: string; fetcher?: typeof fetch } = {},
): Promise<AgrixAccessResult | null> {
  const configuredUrl = options.url ?? process.env.GX_AGRIX_ACCESS_URL;
  if (!configuredUrl?.trim()) return null;
  const url = accessUrl(configuredUrl);
  const secret = options.secret ?? process.env.GX_SERVICE_SECRET;
  if (!url || !secret || secret.length < 32) return { status: 503, error: 'Connexion Agrix indisponible.' };
  const cookie = request.headers.get('cookie');
  if (!cookie) return { status: 401, error: 'Connectez-vous à Agrix pour utiliser GX.ai.' };

  try {
    const response = await (options.fetcher ?? fetch)(url, {
      method: feature ? 'POST' : 'GET',
      headers: {
        'Cookie': cookie,
        'X-GX-Service-Secret': secret,
        ...(feature ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(feature ? { body: JSON.stringify({ feature }) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return { status: response.status === 401 || response.status === 403 || response.status === 429 ? response.status : 503,
        error: response.status === 429 ? 'Votre quota mensuel GX.ai est atteint.'
          : response.status === 403 ? 'Cette fonction nécessite une formule GX.ai compatible.'
            : response.status === 401 ? 'Connectez-vous à Agrix pour utiliser GX.ai.' : 'Connexion Agrix indisponible.' };
    }
    const body: unknown = await response.json();
    if (!body || typeof body !== 'object' || !('userId' in body) || !('plan' in body)
      || typeof body.userId !== 'string' || body.userId.length < 1 || body.userId.length > 128
      || !body.plan || typeof body.plan !== 'object' || !('id' in body.plan) || !('model' in body.plan)) {
      return { status: 503, error: 'Réponse Agrix invalide.' };
    }
    const plan = body.plan as Record<string, unknown>;
    if (typeof plan.id !== 'string' || !['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra'].includes(String(plan.model))) {
      return { status: 503, error: 'Configuration GX.ai invalide.' };
    }
    const eventId = 'usageEventId' in body ? body.usageEventId : undefined;
    if (feature && (typeof eventId !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(eventId))) {
      return { status: 503, error: 'Suivi de consommation GX.ai indisponible.' };
    }
    return { status: 200, identity: { userId: body.userId, planId: plan.id,
      model: plan.model as AgrixIdentity['model'], images: plan.images === true },
      ...(feature ? { usageEventId: eventId as string } : {}) };
  } catch {
    return { status: 503, error: 'Connexion Agrix indisponible.' };
  }
}

export async function completeAgrixUsage(
  request: Request,
  eventId: string | undefined,
  status: AgrixUsageStatus,
  details: { response?: unknown; durationMs?: number; failureCode?: string } = {},
  options: { url?: string; secret?: string; fetcher?: typeof fetch } = {},
): Promise<boolean> {
  const url = accessUrl(options.url ?? process.env.GX_AGRIX_ACCESS_URL);
  const secret = options.secret ?? process.env.GX_SERVICE_SECRET;
  const cookie = request.headers.get('cookie');
  if (!url || !secret || secret.length < 32 || !cookie || !eventId || !/^[a-zA-Z0-9-]{1,80}$/.test(eventId)) return false;
  const body = JSON.stringify({
    usageEventId: eventId,
    status,
    ...(details.response ? { response: usageEvidence(details.response) } : {}),
    ...(typeof details.durationMs === 'number' && Number.isFinite(details.durationMs) && details.durationMs >= 0 ? { durationMs: Math.round(details.durationMs) } : {}),
    ...(details.failureCode ? { failureCode: details.failureCode.slice(0, 80) } : {}),
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await (options.fetcher ?? fetch)(url, {
        method: 'PATCH',
        headers: { Cookie: cookie, 'X-GX-Service-Secret': secret, 'Content-Type': 'application/json' },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(5_000),
      });
      if (response.ok) {
        const result: unknown = await response.json().catch(() => null);
        return Boolean(result && typeof result === "object" && "updated" in result && result.updated === true);
      }
      if (response.status < 500) return false;
    } catch { /* Retry once; completion is idempotent in Agrix. */ }
  }
  return false;
}
