export type GXModelProvider = "meta" | "openai";

const metaModels = new Set(["muse-spark-1.3", "muse-spark-1.2", "muse-spark-1.1", "muse-wonder-1.0"]);

export function gxModelProvider(value: string | undefined): GXModelProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "openai") return "openai";
  return normalized === "meta" ? "meta" : null;
}

export function gxProviderKey(
  provider: GXModelProvider,
  environment: { MODEL_API_KEY?: string; OPENAI_API_KEY?: string } = {
    MODEL_API_KEY: process.env.MODEL_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
): string | undefined {
  return (provider === "meta" ? environment.MODEL_API_KEY : environment.OPENAI_API_KEY)?.trim() || undefined;
}

export function gxProviderModel(provider: GXModelProvider, requested: string | undefined): string {
  const model = requested?.trim();
  if (provider === "openai") return model || "gpt-6-astra";
  if (model && metaModels.has(model)) return model;
  // The Agrix access contract currently returns these OpenAI plan labels.
  // Keep its entitlement decision while selecting a Standard-mode Meta model.
  return model === "gpt-6-astra" ? "muse-wonder-1.0" : "muse-spark-1.3";
}

export function gxProviderBaseUrl(provider: GXModelProvider): string | undefined {
  return provider === "meta" ? "https://api.meta.ai/v1" : undefined;
}
