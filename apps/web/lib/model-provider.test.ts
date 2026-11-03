import assert from "node:assert/strict";
import test from "node:test";

import { gxModelProvider, gxProviderBaseUrl, gxProviderKey, gxProviderModel } from "./model-provider.ts";

test("provider selection is explicit and an invalid value cannot use a key", () => {
  assert.equal(gxModelProvider(undefined), "openai");
  assert.equal(gxModelProvider(" META "), "meta");
  assert.equal(gxModelProvider("other"), null);
  assert.equal(gxProviderKey("meta", { MODEL_API_KEY: " meta-only " }), "meta-only");
  assert.equal(gxProviderKey("meta", { OPENAI_API_KEY: "openai-only" }), undefined);
  assert.equal(gxProviderKey("openai", { OPENAI_API_KEY: "openai-only" }), "openai-only");
  assert.equal(gxProviderBaseUrl("meta"), "https://api.meta.ai/v1");
  assert.equal(gxProviderBaseUrl("openai"), undefined);
});

test("Meta uses Standard models while preserving the Agrix plan tier", () => {
  assert.equal(gxProviderModel("meta", "gpt-6-luna"), "muse-spark-1.3");
  assert.equal(gxProviderModel("meta", "gpt-6.1-sol"), "muse-spark-1.3");
  assert.equal(gxProviderModel("meta", "gpt-6-astra"), "muse-wonder-1.0");
  assert.equal(gxProviderModel("meta", "muse-spark-1.2"), "muse-spark-1.2");
  assert.equal(gxProviderModel("meta", "muse-spark-1.3-contributor"), "muse-spark-1.3");
  assert.equal(gxProviderModel("openai", "gpt-6-luna"), "gpt-6-luna");
});
