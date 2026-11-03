import { calculateWorkMetric, type WorkMetricEvaluation } from "@gx/contracts";

function measured(value: string | undefined): number | null {
  if (!value?.trim()) return null;
  return Number(value.trim().replace(",", "."));
}

function measuredIngredients(value: string | undefined) {
  if (!value?.trim()) return [];
  const lines = value.split(/;|\n|,(?!\d)/u).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 12) return null;
  const ingredients: Array<{ name: string; quantity: number; unit: "g" | "kg" | "ml" | "L" | "pièce" }> = [];
  for (const line of lines) {
    const match = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|pi[eè]ces?|pieces?|pcs?)$/iu.exec(line);
    if (!match) return null;
    const name = match[1]!.trim();
    const quantity = Number(match[2]!.replace(",", "."));
    if (!name || name.length > 60 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100_000) return null;
    const rawUnit = match[3]!.toLowerCase();
    const unit = rawUnit === "l" ? "L" : /^(pi|pc|piece)/u.test(rawUnit) ? "pièce" : rawUnit as "g" | "kg" | "ml";
    ingredients.push({ name, quantity, unit });
  }
  return ingredients;
}

export function dossierMetricCandidate(moduleId: string, values: Record<string, string>): unknown | null {
  const fieldPairs: Record<string, { kind: string; first: string; second: string }> = {
    processing: { kind: "processing_yield", first: "inputMassKg", second: "outputMassKg" },
    recipes: { kind: "recipe_scale", first: "portions", second: "targetPortions" },
    crops: { kind: "plant_incidence", first: "observedPlants", second: "affectedPlants" },
    livestock: { kind: "animal_incidence", first: "observedAnimals", second: "affectedAnimals" },
  };
  const pair = fieldPairs[moduleId];
  if (!pair || (!values[pair.first]?.trim() && !values[pair.second]?.trim())) return null;
  const first = measured(values[pair.first]);
  const second = measured(values[pair.second]);
  switch (pair.kind) {
    case "processing_yield": return { kind: pair.kind, inputMassKg: first, outputMassKg: second };
    case "recipe_scale": return { kind: pair.kind, basePortions: first, targetPortions: second, ingredients: measuredIngredients(values.ingredients) };
    case "plant_incidence": return { kind: pair.kind, observedPlants: first, affectedPlants: second };
    default: return { kind: "animal_incidence", observedAnimals: first, affectedAnimals: second };
  }
}

export function dossierMetric(moduleId: string, values: Record<string, string>, language: "fr" | "en" = "fr"): WorkMetricEvaluation | null {
  const candidate = dossierMetricCandidate(moduleId, values);
  return candidate ? calculateWorkMetric(candidate, language) : null;
}
